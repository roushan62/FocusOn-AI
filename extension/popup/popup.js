/**
 * Popup controller — the entire per-meeting UX (spec Section 9).
 * A non-technical user only needs: open tab → Start → Stop → open Sheet.
 */
import { loadSettings, saveSettings } from "../lib/config.js";

const $ = (id) => document.getElementById(id);
const ROLES = ["unknown", "client", "pmc", "contractor", "architect", "vendor", "focuson"];
let roster = [];
let pollTimer = null;

function send(command, extra = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ channel: "foi-popup", command, ...extra }, (resp) => {
      resolve(resp || { error: chrome.runtime.lastError?.message });
    });
  });
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function detectPlatform(url = "") {
  try {
    const host = new URL(url).hostname;
    if (/(^|\.)meet\.google\.com$/.test(host)) return "google_meet";
    if (/(^|\.)zoom\.(us|com)$/.test(host)) return "zoom";
    if (/(^|\.)teams\.(microsoft|live)\.com$/.test(host)) return "ms_teams";
  } catch (_) { /* not a URL */ }
  return "unknown";
}

/* ------------------------------- roster --------------------------------- */

function renderRoster() {
  const body = $("rosterBody");
  body.innerHTML = "";
  roster.forEach((person, idx) => {
    const tr = document.createElement("tr");
    const roleOptions = ROLES.map((r) =>
      `<option value="${r}" ${person.role === r ? "selected" : ""}>${r}</option>`
    ).join("");
    tr.innerHTML = `
      <td style="width:38%"><input data-k="name" value="${escapeAttr(person.name)}" placeholder="Name" /></td>
      <td style="width:32%"><select data-k="role">${roleOptions}</select></td>
      <td style="width:30%"><input data-k="organization" value="${escapeAttr(person.organization || "")}" placeholder="Org" /></td>`;
    tr.querySelectorAll("input,select").forEach((el) => {
      el.addEventListener("change", () => {
        roster[idx][el.dataset.k] = el.value;
      });
    });
    body.appendChild(tr);
  });
}

function escapeAttr(s = "") {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

async function scanParticipants() {
  const tab = await activeTab();
  if (!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { channel: "foi-query-participants" }, (resp) => {
    if (chrome.runtime.lastError || !resp?.participants?.length) return;
    const existing = new Set(roster.map((r) => r.name.toLowerCase()));
    for (const name of resp.participants) {
      if (!existing.has(name.toLowerCase())) {
        roster.push({ name, role: "unknown", organization: "" });
      }
    }
    renderRoster();
  });
}

/* -------------------------------- state ---------------------------------- */

function show(box) {
  for (const id of ["setupBox", "recordingBox", "processingBox", "resultBox"]) {
    $(id).hidden = id !== box;
  }
}

function setStatus(status, title, detail) {
  const dot = $("statusDot");
  dot.className = "dot " + status;
  $("statusTitle").textContent = title;
  $("statusDetail").textContent = detail;
}

async function refresh() {
  const state = await send("getState");
  if (state?.error && state.status === "idle") return;

  switch (state?.status) {
    case "recording": {
      show("recordingBox");
      $("setupBox").hidden = true;
      const elapsed = Math.max(0, Date.now() - (state.startedAtMs || Date.now()));
      const mm = String(Math.floor(elapsed / 60000)).padStart(2, "0");
      const ss = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, "0");
      $("timer").textContent = `${mm}:${ss}`;
      $("segCount").textContent = `${state.segmentCount || 0} lines captured`;
      setStatus("rec", `Recording — ${state.projectName || "meeting"}`, "Audio is being captured and transcribed.");
      break;
    }
    case "processing":
      show("processingBox");
      setStatus("proc", "Generating MOM…", "Extract, verify, write to Google Sheets.");
      break;
    case "done":
    case "error": {
      show("setupBox");
      if (state.status === "done") {
        setStatus("ok", "MOM ready", "See links below.");
        renderResult(state.result);
      } else {
        setStatus("err", "Error", state.error || "unknown error");
        $("errorBox").hidden = !state.error;
        $("errorBox").textContent = state.error || "";
      }
      if (state.debugLog?.length) {
        $("debugBox").hidden = false;
        $("debugLog").textContent = state.debugLog.map((d) => `${d.at} ${d.msg} ${d.detail || ""}`).join("\n");
      }
      clearInterval(pollTimer);
      pollTimer = null;
      break;
    }
    default:
      show("setupBox");
      setStatus("idle", "Ready", "Open a Google Meet, Zoom or Teams call in this tab.");
  }
}

function renderResult(result) {
  const box = $("resultBox");
  box.hidden = false;
  if (!result) return;
  let html = "";
  if (result.sheetUrl) {
    html += `<a href="${result.sheetUrl}" target="_blank">📄 Open MOM in Google Sheets ↗</a>`;
  } else if (result.status === "needs_google_signin") {
    html += `<button class="gold block" id="retrySheetsBtn">Sign in with Google to write the Sheet</button>`;
  }
  if (result.draftId) {
    html += `<a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" class="gold">✉️ Email draft ready in Gmail ↗</a>`;
  }
  html += `<a href="#" id="pdfLink" class="gold">⬇ Download branded PDF</a>`;
  box.innerHTML = html;

  $("pdfLink")?.addEventListener("click", async (e) => {
    e.preventDefault();
    const settings = await loadSettings();
    const res = await fetch(`${settings.backendUrl.replace(/\/$/, "")}/api/mom/pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {})
      },
      body: JSON.stringify({ mom: result.mom, logoDataUrl: undefined })
    });
    if (!res.ok) {
      $("errorBox").hidden = false;
      $("errorBox").textContent = "PDF failed: " + (await res.text()).slice(0, 200);
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `MOM_${(result.projectName || "Meeting").replace(/[^\w-]+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $("retrySheetsBtn")?.addEventListener("click", async () => {
    $("retrySheetsBtn").textContent = "Signing in…";
    const resp = await send("retrySheets");
    if (resp?.ok) await refresh();
    else {
      $("errorBox").hidden = false;
      $("errorBox").textContent = resp?.error || "Google sign-in failed";
      $("retrySheetsBtn").textContent = "Sign in with Google to write the Sheet";
    }
  });
}

/* -------------------------------- start/stop ------------------------------ */

async function start() {
  $("errorBox").hidden = true;
  const tab = await activeTab();
  if (!tab?.id) return;
  const platform = detectPlatform(tab.url);
  if (platform === "unknown") {
    $("errorBox").hidden = false;
    $("errorBox").textContent = "This tab is not a Google Meet / Zoom / Teams meeting. Open the meeting tab first.";
    return;
  }
  const settings = await loadSettings();
  if (!settings.backendUrl) {
    $("errorBox").hidden = false;
    $("errorBox").textContent = "Complete one-time setup first (Settings → Backend URL).";
    chrome.runtime.openOptionsPage();
    return;
  }
  const projectName = $("projectName").value.trim() || settings.defaultProjectName || "Meeting";
  await saveSettings({ roster, defaultProjectName: projectName });

  $("startBtn").disabled = true;
  $("startBtn").textContent = "Starting…";
  const resp = await send("start", { tabId: tab.id, platform, projectName, roster });
  $("startBtn").disabled = false;
  $("startBtn").textContent = "● Start Meeting Assistant";
  if (!resp?.ok) {
    $("errorBox").hidden = false;
    $("errorBox").textContent = resp?.error || "Could not start capture.";
    return;
  }
  pollTimer = pollTimer || setInterval(refresh, 2000);
  await refresh();
}

async function stop() {
  show("processingBox");
  setStatus("proc", "Generating MOM…", "This can take 30–90 seconds for long meetings.");
  const resp = await send("stop");
  if (!resp?.ok) {
    $("errorBox").hidden = false;
    $("errorBox").textContent = resp?.error || "Processing failed.";
  }
  await refresh();
}

/* --------------------------------- init ----------------------------------- */

$("startBtn").addEventListener("click", start);
$("stopBtn").addEventListener("click", stop);
$("addPersonBtn").addEventListener("click", () => {
  roster.push({ name: "", role: "unknown", organization: "" });
  renderRoster();
});
$("scanBtn").addEventListener("click", scanParticipants);
$("optionsLink").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
$("debugLink").addEventListener("click", (e) => {
  e.preventDefault();
  $("debugBox").hidden = !$("debugBox").hidden;
});

(async function init() {
  const settings = await loadSettings();
  roster = (settings.roster || []).map((r) => ({ name: r.name || "", role: r.role || "unknown", organization: r.organization || "" }));
  if (!roster.length) roster = [{ name: "", role: "unknown", organization: "" }];
  if (settings.defaultProjectName) $("projectName").value = settings.defaultProjectName;
  renderRoster();
  void scanParticipants();
  await refresh();
  pollTimer = setInterval(refresh, 2000);
})();
