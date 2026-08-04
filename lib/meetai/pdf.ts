import { jsPDF } from "jspdf";
import { MomDocument } from "./types";

/**
 * Branded MOM PDF (same structure as the Sheet) built with jsPDF.
 * Navy #1A1F5C headings, gold #C9A227 dividers, Arial-family (Helvetica).
 */

const NAVY: [number, number, number] = [0x1a, 0x1f, 0x5c];
const GOLD: [number, number, number] = [0xc9, 0xa2, 0x27];
const GRAY: [number, number, number] = [90, 90, 90];

export function buildMomPdf(mom: MomDocument, logoDataUrl?: string): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const sectionTitle = (text: string) => {
    ensureSpace(34);
    y += 12;
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, pageW - margin * 2, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(text, margin + 6, y + 12.5);
    doc.setTextColor(0, 0, 0);
    y += 22;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1.4);
    doc.line(margin, y - 2, pageW - margin, y - 2);
  };

  const para = (text: string, size = 9, bold = false, color?: [number, number, number]) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    if (color) doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, pageW - margin * 2) as string[];
    ensureSpace(lines.length * (size + 3));
    doc.text(lines, margin, y + size);
    y += lines.length * (size + 3) + 2;
    if (color) doc.setTextColor(0, 0, 0);
  };

  const table = (columns: string[], rows: string[][]) => {
    if (!rows.length) {
      para("— none recorded —", 9, false, GRAY);
      return;
    }
    const colW = (pageW - margin * 2) / columns.length;
    ensureSpace(20);
    doc.setFillColor(...GOLD);
    doc.rect(margin, y, pageW - margin * 2, 14, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    columns.forEach((c, i) => doc.text(c, margin + 3 + i * colW, y + 10));
    y += 16;
    doc.setFont("helvetica", "normal");
    rows.forEach((row) => {
      const wrapped = row.map(
        (cell) => doc.splitTextToSize(String(cell ?? ""), colW - 6) as string[]
      );
      const height = Math.max(...wrapped.map((w) => w.length)) * 9 + 6;
      ensureSpace(height);
      wrapped.forEach((w, i) => doc.text(w, margin + 3 + i * colW, y + 8));
      y += height;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.4);
      doc.line(margin, y - 2, pageW - margin, y - 2);
    });
  };

  /* ------------------------------- header ------------------------------- */
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "PNG", margin, margin, 40, 40);
    } catch {
      /* logo is decorative only */
    }
  }
  doc.setFillColor(...NAVY);
  doc.rect(margin, y, pageW - margin * 2, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${(mom.companyName || "FOCUSON INTERIORS PVT. LTD.").toUpperCase()} — MINUTES OF MEETING`,
    pageW / 2,
    y + 19,
    { align: "center", maxWidth: pageW - margin * 2 - 10 }
  );
  doc.setTextColor(0, 0, 0);
  y += 40;
  const d = new Date(mom.meetingDate);
  para(
    `Project: ${mom.projectName || "—"}    Meeting Date: ${d.toLocaleDateString("en-IN")}    ` +
      `Duration: ${Math.floor(mom.durationMinutes / 60)}h ${String(Math.round(mom.durationMinutes % 60)).padStart(2, "0")}m    ` +
      `Platform: ${mom.platform}    Prepared By: ${mom.preparedBy || "—"}`,
    9
  );

  sectionTitle("ATTENDEES");
  table(
    ["Name", "Organization", "Role", "Email"],
    mom.attendees.map((a) => [a.name, a.organization ?? "", String(a.role), a.email ?? ""])
  );

  sectionTitle("AGENDA");
  para(mom.agenda || "Not explicitly stated — inferred agenda unavailable.");

  sectionTitle("DISCUSSION TIMELINE");
  table(
    ["Time", "Topic", "Summary", "Screen Context"],
    mom.timeline.map((t) => [t.time, t.topic, t.summary, t.screenContext ?? ""])
  );

  sectionTitle("DECISIONS");
  table(
    ["#", "Decision", "Related To", "Confirmed By"],
    mom.decisions.map((x, i) => [String(i + 1), x.decision, x.relatedTo ?? "", x.confirmedBy ?? ""])
  );

  sectionTitle("ACTION ITEMS");
  table(
    ["#", "Owner", "Task", "Due", "Priority", "Status"],
    mom.actionItems.map((x, i) => [
      String(i + 1),
      x.owner,
      x.task,
      (x.dueDate ?? "") + (x.dueDateInferred ? " (inferred)" : ""),
      x.priority,
      x.status,
    ])
  );

  sectionTitle("RISKS");
  table(
    ["#", "Risk", "Impact Area", "Suggested Mitigation (AI Suggestion — confirm with PM)"],
    mom.risks.map((x, i) => [String(i + 1), x.risk, x.impactArea ?? "", x.suggestedMitigation ?? ""])
  );

  sectionTitle("OPEN ISSUES");
  table(
    ["#", "Issue", "Owner", "Target Date"],
    mom.openIssues.map((x, i) => [String(i + 1), x.issue, x.owner ?? "", x.targetDate ?? ""])
  );

  sectionTitle("CLIENT CONCERNS / ESCALATIONS");
  if (!mom.clientConcerns.length) {
    para("No explicit client concerns or escalations were detected in this meeting.", 9, false, GRAY);
  } else {
    table(
      ["#", "Concern (verbatim-close quote)", "Severity", "Raised By", "Timestamp"],
      mom.clientConcerns.map((x, i) => [
        String(i + 1), x.concern, x.severity, x.raisedBy ?? "", x.timestamp ?? "",
      ])
    );
  }

  sectionTitle("COMMITMENTS MADE");
  table(
    ["#", "Who", "Promised"],
    mom.commitments.map((x, i) => [String(i + 1), x.who, x.promised])
  );

  sectionTitle("NEXT MEETING");
  para(mom.nextMeeting.confirmed && mom.nextMeeting.dateText
    ? mom.nextMeeting.dateText
    : "Not scheduled — confirm with client.");

  y += 12;
  ensureSpace(30);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 12;
  para(
    `${mom.disclaimer} · Generated ${new Date(mom.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
    8,
    false,
    GRAY
  );

  return doc.output("arraybuffer") as unknown as Uint8Array;
}
