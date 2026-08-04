import { ActionItem, ClientConcern, Decision, MomDocument, OpenIssue, Risk, TimelineEntry } from "../types";

/**
 * Google Sheets MOM writer — builds the exact layout from spec Section 7
 * through the Sheets v4 REST API, using the OAuth access token the extension
 * obtained with chrome.identity (scopes: spreadsheets).
 *
 * Layout per meeting tab (MOM_<Project>_<DDMMYY>):
 *  - Navy #1A1F5C header block (merged, white bold text)
 *  - Gold #C9A227 section dividers
 *  - Attendees / Agenda / Discussion Timeline / Decisions / Action Items
 *    (conditional red <3-day due / green done) / Risks / Open Issues /
 *    Client Concerns (escalations) / Commitments / Next Meeting / Footer
 *  - Low-confidence and ⚠️ Please verify rows highlighted yellow
 *  - Hidden "Raw Transcript" tab for source traceability
 */

const NAVY = { red: 0x1a / 255, green: 0x1f / 255, blue: 0x5c / 255 };
const GOLD = { red: 0xc9 / 255, green: 0xa2 / 255, blue: 0x27 / 255 };
const WHITE = { red: 1, green: 1, blue: 1 };
const LIGHT_ROW = { red: 0.96, green: 0.97, blue: 0.99 };
const YELLOW_FLAG = { red: 1, green: 0.95, blue: 0.6 };
const RED_URGENT = { red: 0.99, green: 0.8, blue: 0.8 };
const GREEN_DONE = { red: 0.8, green: 0.95, blue: 0.82 };

const API = "https://sheets.googleapis.com/v4/spreadsheets";

class SheetsApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "SheetsApiError";
  }
}

async function sheetsFetch(
  token: string,
  url: string,
  init: RequestInit = {}
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SheetsApiError(
      res.status === 401 || res.status === 403
        ? "Google authorization failed — sign in again from the extension popup."
        : `Google Sheets API error ${res.status}: ${body.slice(0, 300)}`,
      res.status
    );
  }
  return res.status === 204 ? {} : ((await res.json()) as Record<string, unknown>);
}

export function tabNameFor(projectName: string, dateIso: string): string {
  const d = new Date(dateIso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  const proj = (projectName || "Project").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 24);
  return `MOM_${proj}_${dd}${mm}${yy}`;
}

function flaggedRow(item: { confidence?: string; verificationFlag?: string }) {
  return item.verificationFlag || item.confidence === "Low";
}

function flagPrefix(item: { verificationFlag?: string }) {
  return item.verificationFlag ? `${item.verificationFlag} | ` : "";
}

export async function writeMomToSheet(input: {
  accessToken: string;
  spreadsheetId?: string;
  mom: MomDocument;
  logoUrl?: string;
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string; tabName: string }> {
  const { accessToken: token, mom } = input;
  const tabName = tabNameFor(mom.projectName, mom.meetingDate);

  // 1) Spreadsheet: reuse the master log or create it.
  let spreadsheetId = input.spreadsheetId;
  if (!spreadsheetId) {
    const created = await sheetsFetch(token, API, {
      method: "POST",
      body: JSON.stringify({
        properties: { title: `FocusOn MOM Log — ${mom.projectName || "Project"}` },
      }),
    });
    spreadsheetId = created.spreadsheetId as string;
  }
  const spreadsheet = (await sheetsFetch(
    token,
    `${API}/${spreadsheetId}?fields=spreadsheetUrl,sheets(properties)`
  )) as {
    spreadsheetUrl?: string;
    sheets?: Array<{ properties: { sheetId: number; title: string; hidden?: boolean } }>;
  };

  // 2) Add (or reuse after clearing) the meeting tab.
  const existing = spreadsheet.sheets?.find((s) => s.properties.title === tabName);
  const requests: Array<Record<string, unknown>> = [];
  let sheetId: number;
  if (existing) {
    sheetId = existing.properties.sheetId;
    requests.push({
      updateSheetProperties: {
        properties: { sheetId, hidden: false },
        fields: "hidden",
      },
    });
  } else {
    const added = (await sheetsFetch(token, `${API}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: tabName, gridProperties: { columnCount: 8 } } } }],
      }),
    })) as { replies?: Array<{ addSheet?: { properties?: { sheetId?: number } } }> };
    sheetId = added.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  }
  if (!sheetId) throw new SheetsApiError("Could not create the meeting tab");

  // 3) Compose rows.
  const d = new Date(mom.meetingDate);
  const dateText = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const durationText = `${Math.floor(mom.durationMinutes / 60)}h ${String(Math.round(mom.durationMinutes % 60)).padStart(2, "0")}m`;

  type Row = { cells: string[]; style: "title" | "meta" | "section" | "columns" | "data" };
  const out: Row[] = [];
  const flaggedDataRows: number[] = [];
  let r = 0;

  const push = (cells: string[], style: Row["style"], flagged = false) => {
    out.push({ cells, style });
    if (flagged) flaggedDataRows.push(r);
    r += 1;
  };

  // Header block (merged across 8 columns)
  push([`${(mom.companyName || "FOCUSON INTERIORS PVT. LTD.").toUpperCase()} — MINUTES OF MEETING`], "title");
  push([`Project: ${mom.projectName || "—"}`, `Meeting Date: ${dateText}`, `Duration: ${durationText}`], "meta");
  push([`Location/Platform: ${platformLabel(mom.platform)}`, `Prepared By: ${mom.preparedBy || "FocusOn Team"}`], "meta");
  push([""], "data");

  const section = (title: string, columns: string[], rows: string[][], flagged: number[]) => {
    push([title], "section");
    push(columns, "columns");
    rows.forEach((row, i) => push(row, "data", flagged.includes(i)));
    push([""], "data");
  };

  const attendeesRows = (mom.attendees.length ? mom.attendees : [{ name: "Unidentified Speaker", organization: "", role: "unknown", email: "" }])
    .map((a) => [
      a.name,
      a.organization ?? "",
      roleLabel(a.role),
      a.email ?? "",
      a.confirmed ? "" : "⚠️ unconfirmed attendance",
    ]);
  section("ATTENDEES", ["Name", "Organization", "Role", "Email", "Note"], attendeesRows,
    mom.attendees.map((a, i) => (a.confirmed === false ? i : -1)).filter((i) => i >= 0));

  push(["AGENDA"], "section");
  push([mom.agenda || "Not explicitly stated — inferred agenda unavailable."], "data");
  push([""], "data");

  section(
    "DISCUSSION TIMELINE",
    ["Time", "Topic", "Summary", "Screen Context", "Source Quote"],
    mom.timeline.map((t: TimelineEntry) => [
      t.time, flagPrefix(t) + t.topic, t.summary, t.screenContext ?? "", t.sourceQuote ?? "",
    ]),
    mom.timeline.map((t, i) => (flaggedRow(t) ? i : -1)).filter((i) => i >= 0)
  );

  section(
    "DECISIONS",
    ["#", "Decision", "Related To", "Confirmed By", "Source Quote"],
    mom.decisions.map((x: Decision, i) => [
      String(i + 1), flagPrefix(x) + x.decision, x.relatedTo ?? "", x.confirmedBy ?? "", x.sourceQuote ?? "",
    ]),
    mom.decisions.map((x, i) => (flaggedRow(x) ? i : -1)).filter((i) => i >= 0)
  );

  section(
    "ACTION ITEMS",
    ["#", "Owner", "Task", "Due Date", "Priority", "Status", "Source Quote"],
    mom.actionItems.map((x: ActionItem, i) => [
      String(i + 1),
      x.owner,
      flagPrefix(x) + x.task,
      (x.dueDate ?? "") + (x.dueDateInferred && x.dueDateNote ? ` ${x.dueDateNote}` : ""),
      x.priority,
      x.status || "Pending",
      x.sourceQuote ?? "",
    ]),
    mom.actionItems.map((x, i) => (flaggedRow(x) ? i : -1)).filter((i) => i >= 0)
  );

  section(
    "RISKS",
    ["#", "Risk", "Impact Area", "Suggested Mitigation (AI Suggestion — confirm with PM)", "Source Quote"],
    mom.risks.map((x: Risk, i) => [
      String(i + 1), flagPrefix(x) + x.risk, x.impactArea ?? "",
      x.suggestedMitigation ?? "", x.sourceQuote ?? "",
    ]),
    mom.risks.map((x, i) => (flaggedRow(x) ? i : -1)).filter((i) => i >= 0)
  );

  section(
    "OPEN ISSUES",
    ["#", "Issue", "Owner", "Target Resolution Date", "Source Quote"],
    mom.openIssues.map((x: OpenIssue, i) => [
      String(i + 1), flagPrefix(x) + x.issue, x.owner ?? "",
      (x.targetDate ?? "") + (x.targetDateInferred ? " (inferred — confirm)" : ""), x.sourceQuote ?? "",
    ]),
    mom.openIssues.map((x, i) => (flaggedRow(x) ? i : -1)).filter((i) => i >= 0)
  );

  section(
    "CLIENT CONCERNS / ESCALATIONS",
    ["#", "Concern (verbatim-close quote)", "Severity", "Raised By", "Timestamp"],
    mom.clientConcerns.map((x: ClientConcern, i) => [
      String(i + 1), flagPrefix(x) + x.concern, x.severity, x.raisedBy ?? "", x.timestamp ?? x.sourceTimestamp ?? "",
    ]),
    mom.clientConcerns.map((x, i) => (flaggedRow(x) ? i : -1)).filter((i) => i >= 0)
  );

  section(
    "COMMITMENTS MADE",
    ["#", "Who", "Promised", "Source Quote"],
    mom.commitments.map((x, i) => [String(i + 1), x.who, flagPrefix(x) + x.promised, x.sourceQuote ?? ""]),
    mom.commitments.map((x, i) => (flaggedRow(x) ? i : -1)).filter((i) => i >= 0)
  );

  push(["NEXT MEETING"], "section");
  push([mom.nextMeeting.confirmed && mom.nextMeeting.dateText
    ? mom.nextMeeting.dateText
    : "Not scheduled — confirm with client."], "data");
  push([""], "data");
  push([
    `${mom.disclaimer} · Generated ${new Date(mom.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST` +
      (mom.provenance
        ? ` · Providers: STT=${mom.provenance.sttProviders?.join(",") || "—"} / MOM=${mom.provenance.extractionProvider ?? "—"} / Verify=${mom.provenance.verificationProvider ?? "—"}`
        : ""),
  ], "meta");

  // 4) Write values in one call.
  const values = out.map((row) => padRow(row.cells, 8));
  await sheetsFetch(
    token,
    `${API}/${spreadsheetId}/values/${encodeURIComponent(`'${tabName}'!A1:H${values.length}`)}?valueInputOption=USER_ENTERED`,
    { method: "PUT", body: JSON.stringify({ values }) }
  );

  // 5) Formatting: merges, colors, borders, row heights, conditional formats.
  let absRow = 0;
  for (let i = 0; i < out.length; i += 1) {
    const row = out[i];
    if (row.style === "title") {
      requests.push(merge(sheetId, absRow, 0, 8));
      requests.push(styleCell(sheetId, absRow, 0, 8, NAVY, WHITE, 14, true, "CENTER"));
      requests.push(setRowHeight(sheetId, absRow, 34));
    } else if (row.style === "meta") {
      requests.push(styleCell(sheetId, absRow, 0, 8, LIGHT_ROW, undefined, 10, i === 1, "LEFT"));
    } else if (row.style === "section") {
      requests.push(merge(sheetId, absRow, 0, 8));
      requests.push(styleCell(sheetId, absRow, 0, 8, NAVY, WHITE, 11, true, "LEFT"));
      requests.push(goldBorder(sheetId, absRow, 0, 8));
      requests.push(setRowHeight(sheetId, absRow, 22));
    } else if (row.style === "columns") {
      requests.push(styleCell(sheetId, absRow, 0, 8, GOLD, { red: 0.14, green: 0.1, blue: 0 }, 10, true, "LEFT"));
    } else {
      requests.push(styleCell(sheetId, absRow, 0, 8, undefined, undefined, 10, false, "LEFT", "WRAP"));
    }
    absRow += 1;
  }
  for (const rowIdx of flaggedDataRows) {
    requests.push(styleCell(sheetId, rowIdx, 0, 8, YELLOW_FLAG, undefined, 10, false, "LEFT", "WRAP"));
  }

  // Conditional formatting on the Action Items table: find its data range.
  const actionHeaderIdx = out.findIndex((row) => row.cells[0] === "ACTION ITEMS");
  if (actionHeaderIdx >= 0 && mom.actionItems.length) {
    const dataStart = actionHeaderIdx + 2; // skip columns row
    const dataEnd = dataStart + mom.actionItems.length;
    const range = gridRange(sheetId, dataStart, dataEnd, 0, 8);
    // RED: due within 3 days of meeting and still Pending (cols D=3, F=5)
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [range],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{
                userEnteredValue:
                  `=AND($F${dataStart + 1}="Pending",$D${dataStart + 1}<>"",` +
                  `IFERROR(DATEVALUE(LEFT($D${dataStart + 1},10)),TODAY()+99)<=TODAY()+3)`,
              }],
            },
            format: { backgroundColor: RED_URGENT },
          },
        },
        index: 0,
      },
    });
    // GREEN: anything marked Done
    requests.push({
      addConditionalFormatRule: {
        rule: {
          ranges: [range],
          booleanRule: {
            condition: {
              type: "CUSTOM_FORMULA",
              values: [{ userEnteredValue: `=$F${dataStart + 1}="Done"` }],
            },
            format: { backgroundColor: GREEN_DONE },
          },
        },
        index: 1,
      },
    });
  }

  // Column widths.
  const widths = [140, 170, 170, 210, 90, 120, 220, 110];
  widths.forEach((px, i) => {
    requests.push({
      updateDimensionProperties: {
        range: { sheetId, dimension: "COLUMNS", startIndex: i, endIndex: i + 1 },
        properties: { pixelSize: px },
        fields: "pixelSize",
      },
    });
  });

  // Logo (optional): place an =IMAGE() formula in the spacer row's last cell
  // (row 1 is merged across all columns, so the logo goes underneath it).
  if (input.logoUrl) {
    requests.push({
      updateCells: {
        range: gridRange(sheetId, 3, 4, 7, 8),
        rows: [{
          values: [{ userEnteredValue: { formulaValue: `=IMAGE("${input.logoUrl.replace(/"/g, "")}")` } }],
        }],
        fields: "userEnteredValue",
      },
    });
  }

  const cleanRequests = requests;
  cleanRequests.push({
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: 0 } },
      fields: "gridProperties.frozenRowCount",
    },
  });

  await sheetsFetch(token, `${API}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ requests: cleanRequests }),
  });

  // 6) Raw transcript archived in a hidden tab (spec Section 8.7).
  if (mom.transcriptText) {
    await archiveTranscript(token, spreadsheetId, mom.transcriptText, tabName);
  }

  return {
    spreadsheetId,
    spreadsheetUrl: spreadsheet.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    tabName,
  };
}

async function archiveTranscript(
  token: string,
  spreadsheetId: string,
  transcript: string,
  momTabName: string
): Promise<void> {
  const title = `Transcript_${momTabName}`;
  const sheet = (await sheetsFetch(
    token,
    `${API}/${spreadsheetId}?fields=sheets(properties)`
  )) as { sheets?: Array<{ properties: { sheetId: number; title: string } }> };
  let sheetId = sheet.sheets?.find((s) => s.properties.title === title)?.properties.sheetId;
  if (!sheetId) {
    const added = (await sheetsFetch(token, `${API}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
    })) as { replies?: Array<{ addSheet?: { properties?: { sheetId?: number } } }> };
    sheetId = added.replies?.[0]?.addSheet?.properties?.sheetId ?? 0;
  }
  if (!sheetId) return;
  const lines = transcript.split("\n").slice(0, 9000).map((line) => [line.slice(0, 40000)]);
  await sheetsFetch(
    token,
    `${API}/${spreadsheetId}/values/${encodeURIComponent(`'${title}'!A1:A${lines.length}`)}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: lines }) }
  );
  await sheetsFetch(token, `${API}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [{
        updateSheetProperties: { properties: { sheetId, hidden: true }, fields: "hidden" },
      }],
    }),
  });
}

/* ------------------------------ request kits ----------------------------- */

function padRow(row: string[], width: number): string[] {
  const copy = [...row];
  while (copy.length < width) copy.push("");
  return copy.slice(0, width);
}

function gridRange(sheetId: number, startRow: number, endRow: number, startCol: number, endCol: number) {
  return { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol };
}

function merge(sheetId: number, row: number, startCol: number, endCol: number) {
  return { mergeCells: { range: gridRange(sheetId, row, row + 1, startCol, endCol), mergeType: "MERGE_ALL" } };
}

function styleCell(
  sheetId: number,
  row: number,
  startCol: number,
  endCol: number,
  bg?: typeof NAVY,
  fg?: { red: number; green: number; blue: number },
  fontSize = 10,
  bold = false,
  hAlign = "LEFT",
  wrap?: "WRAP"
) {
  const format: Record<string, unknown> = {
    textFormat: { fontSize, bold, fontFamily: "Arial", ...(fg ? { foregroundColor: fg } : {}) },
    horizontalAlignment: hAlign,
    ...(wrap ? { wrapStrategy: wrap } : {}),
    ...(bg ? { backgroundColor: bg } : {}),
  };
  return {
    repeatCell: {
      range: gridRange(sheetId, row, row + 1, startCol, endCol),
      cell: { userEnteredFormat: format },
      fields:
        "userEnteredFormat(textFormat,horizontalAlignment,wrapStrategy,backgroundColor)",
    },
  };
}

function goldBorder(sheetId: number, row: number, startCol: number, endCol: number) {
  return {
    updateBorders: {
      range: gridRange(sheetId, row, row + 1, startCol, endCol),
      bottom: { style: "SOLID_MEDIUM", width: 2, color: GOLD },
    },
  };
}

function setRowHeight(sheetId: number, row: number, px: number) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "ROWS", startIndex: row, endIndex: row + 1 },
      properties: { pixelSize: px },
      fields: "pixelSize",
    },
  };
}

function platformLabel(platform: string): string {
  switch (platform) {
    case "google_meet": return "Google Meet";
    case "zoom": return "Zoom (Web)";
    case "ms_teams": return "Microsoft Teams (Web)";
    default: return platform || "Unknown";
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    client: "Client",
    pmc: "PMC",
    contractor: "Contractor",
    architect: "Architect",
    vendor: "Vendor",
    focuson: "FocusOn",
    unknown: "Unknown",
  };
  return map[role] ?? role;
}
