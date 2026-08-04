/**
 * FOI-MeetAI background service worker — the meeting conductor.
 *
 * Owns: tabCapture session, the offscreen audio recorder, transcript
 * accumulation, live (2-min) analysis, periodic screenshot tagging, and the
 * end-of-meeting pipeline: diarize → final analyze → verify → Google Sheet →
 * PDF → Gmail draft. It never shows provider errors in the meeting flow; it
 * simply keeps working through the fallback chain and records the debug log.
 */
import { loadSettings, foiFetch, populatedKeys } from "../lib/config.js";

const STATE_KEY = "foiSession";
const RESULT_KEY = "foiLastResult";

let state = null;

/* ------------------------------- state ---------------------------------- */

function freshState() {
  return {
    status: "idle", // idle | recording | processing | done | error
    meetingId: null,
    tabId: null,
    windowId: null,
    platform: "unknown",
    projectName: "",
    startedAtMs: 0,
    roster: [],
    segments: [],
    contextEvents: [],
    partialExtraction: null,
    extractionProvider: null,
    sttProviders: new Set(),
    analyzedUpToMs: 0,
    debugLog: [],
    error: null
  };
}

state = freshState();

async function persist() {
  const snapshot = { ...state, sttProviders: [...state.sttProviders] };
  await chrome.storage.session.set({ [STATE_KEY]: snapshot, [RESULT_KEY]: await getResult() }).catch(() => {});
}

let cachedResult = null;
async function getResult() {
  return cachedResult;
}

async function rehydrate() {
  const stored = await chrome.storage.session.get([STATE_KEY, RESULT_KEY]);
  if (stored[STATE_KEY]?.status === "recording" || stored[STATE_KEY]?.status === "processing") {
    state = { ...stored[STATE_KEY], sttProviders: new Set(stored[STATE_KEY].sttProviders || []) };
  }
  cachedResult = stored[RESULT_KEY] || null;
}

function debug(entry) {
  state.debugLog.push({ at: new Date().toISOString(), ...entry });
  if (state.debugLog.length > 500) state.debugLog.shift();
  console.log("[FOI]", entry.msg, entry.detail || "");
}

function meetingMs() {
  return state.startedAtMs ? Date.now() - state.startedAtMs : 0;
}

function setBadge() {
  const map = {
    idle: { text: "", color: "#64748b" },
    recording: { text: "REC", color: "#dc2626" },
    processing: { text: "…", color: "#d97706" },
    done: { text: "✓", color: "#059669" },
    error: { text: "!", color: "#dc2626" }
  };
  const cfg = map[state.status] || map.idle;
  void chrome.action.setBadgeText({ text: cfg.text });
  void chrome.action.setBadgeBackgroundColor({ color: cfg.color });
}

/* ------------------------------ recording -------------------------------- */

async function getStreamId(tabId) {
  if (chrome.tabCapture.getMediaStreamId) {
    return chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  }
  // Older Chrome exposes the callback-style API.
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(id);
    });
  });
}

async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument?.().catch(() => false);
  if (existing) return;
  await chrome.offscreen.createDocument({
    url: "offscreen/offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Tab audio capture and chunked transcription during the meeting."
  });
}

async function startCapture(msg) {
  if (state.status === "recording" || state.status === "processing") {
    throw new Error("A meeting is already being captured — stop it first.");
  }
  const settings = await loadSettings();
  if (!settings.backendUrl) {
    throw new Error("Set the Backend URL first (right-click the extension icon → Options).");
  }

  const tabId = msg.tabId;
  const tab = await chrome.tabs.get(tabId);

  state = freshState();
  state.status = "recording";
  state.meetingId = crypto.randomUUID();
  state.tabId = tabId;
  state.windowId = tab.windowId;
  state.platform = msg.platform || "unknown";
  state.projectName = msg.projectName || settings.defaultProjectName || tab.title?.slice(0, 60) || "Meeting";
  state.startedAtMs = Date.now();
  state.roster = (msg.roster || settings.roster || []).map((r) => ({ ...r, confirmed: Boolean(r.role && r.role !== "unknown") }));
  setBadge();
  debug({ msg: "capture started", detail: `${state.platform} · ${state.projectName}` });

  const streamId = await getStreamId(tabId);
  await ensureOffscreen();

  const sttKeys = {};
  for (const [k, v] of Object.entries(populatedKeys(settings))) sttKeys[k] = v;

  chrome.runtime.sendMessage({
    channel: "foi-offscreen",
    command: "start",
    streamId,
    settings: {
      backendUrl: settings.backendUrl,
      apiToken: settings.apiToken,
      providerKeys: sttKeys,
      languageHints: settings.languageHints,
      chunkSeconds: settings.chunkSeconds,
      orderedSttIds: settings.sttPriority
    },
    meetingId: state.meetingId
  });

  // Register the session with the backend (best-effort; works without DB).
  foiFetch(settings, "/api/meetings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: state.meetingId,
      title: tab.title?.slice(0, 120) || "Meeting",
      project_name: state.projectName,
      platform: state.platform,
      started_at: new Date(state.startedAtMs).toISOString(),
      status: "recording"
    })
  }).catch((e) => debug({ msg: "meeting register failed (continuing)", detail: e.message }));

  // Live analysis + screenshot alarms.
  const analyzeEveryMin = Math.max(1, (settings.analyzeEverySeconds || 120) / 60);
  const shotEveryMin = Math.max(0.4, (settings.screenshotEverySeconds || 45) / 60);
  await chrome.alarms.create("foi-live-analysis", { periodInMinutes: analyzeEveryMin });
  await chrome.alarms.create("foi-screenshot", { periodInMinutes: shotEveryMin, delayInMinutes: shotEveryMin });
  await chrome.alarms.create("foi-keepalive", { periodInMinutes: 0.4 });

  await persist();
  return { meetingId: state.meetingId };
}

/* --------------------------- context & chunks ---------------------------- */

function handleContextEvent(msg) {
  if (state.status !== "recording") return;
  if (msg.platform && state.platform === "unknown") state.platform = msg.platform;
  const rel = { ...msg.event, atMs: Math.max(0, (msg.event.atMs || Date.now()) - state.startedAtMs) };
  // caption text doubles as a transcription backstop: keep ALL captions.
  state.contextEvents.push(rel);
  if (state.contextEvents.length > 20000) state.contextEvents.splice(0, 2000);
}

function handleChunkResult(msg) {
  if (state.status !== "recording") return;
  const segments = (msg.segments || []).map((s) => ({ ...s }));
  state.segments.push(...segments);
  if (msg.provider) state.sttProviders.add(msg.provider);
  debug({ msg: `chunk transcribed via ${msg.provider}`, detail: `${(msg.text || "").length} chars` });
}

function handleChunkFailed(msg) {
  debug({ msg: "chunk failed after retries", detail: msg.error });
  // The offscreen recorder keeps going; lost audio surfaces as a gap. The
  // offline queue inside the offscreen document retries on reconnect.
}

/* ----------------------------- live analysis ----------------------------- */

async function runLiveAnalysis() {
  if (state.status !== "recording") return;
  const lastTwoMinutes = state.segments.filter((s) => s.endMs > meetingMs() - 150000);
  // Skip when nothing new was said since the last pass.
  if (!lastTwoMinutes.length || meetingMs() - state.analyzedUpToMs < 60000) return;

  try {
    const settings = await loadSettings();
    const res = await foiFetch(settings, "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: state.projectName,
        platform: state.platform,
        meetingDate: dateInKolkata(state.startedAtMs),
        meetingStartIso: new Date(state.startedAtMs).toISOString(),
        durationMinutes: Math.round(meetingMs() / 60000),
        roster: state.roster,
        segments: state.segments,
        contextEvents: state.contextEvents,
        previousExtraction: state.partialExtraction,
        providerKeys: populatedKeys(settings),
        orderedLlmIds: settings.llmPriority,
        final: false
      })
    });
    if (!res.ok) throw new Error(`analyze ${res.status}`);
    const data = await res.json();
    state.partialExtraction = data.extraction;
    state.extractionProvider = data.provider;
    state.analyzedUpToMs = meetingMs();
    debug({ msg: "live analysis updated", detail: data.provider });
    await persist();
  } catch (err) {
    debug({ msg: "live analysis failed (will retry next tick)", detail: err.message });
  }
}

async function captureScreenContext() {
  if (state.status !== "recording" || state.windowId == null) return;
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(state.windowId, { format: "jpeg", quality: 55 });
    const base64 = dataUrl.split(",")[1];
    const settings = await loadSettings();
    const res = await foiFetch(settings, "/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: "image/jpeg",
        atMs: meetingMs(),
        providerKeys: populatedKeys(settings)
      })
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.category && data.category !== "Video/People") {
      state.contextEvents.push({ type: "screen", atMs: meetingMs(), screenCategory: data.category });
      debug({ msg: "screen context", detail: data.category });
    }
  } catch (err) {
    debug({ msg: "screenshot skipped", detail: err.message });
  }
}

/* ------------------------------ stop → MOM ------------------------------- */

async function askGoogleToken(interactive) {
  try {
    return await chrome.identity.getAuthToken({ interactive });
  } catch (err) {
    debug({ msg: "google token failed", detail: err.message });
    return null;
  }
}

function dateInKolkata(epochMs) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(epochMs));
}

function asArray(v) { return Array.isArray(v) ? v : []; }

function extractionToMom(extraction, provenance) {
  return {
    projectName: state.projectName,
    meetingDate: new Date(state.startedAtMs).toISOString(),
    durationMinutes: Math.max(1, Math.round((Date.now() - state.startedAtMs) / 60000)),
    platform: state.platform,
    preparedBy: provenance.preparedBy || "",
    companyName: provenance.companyName || "FocusOn Interiors Pvt. Ltd.",
    attendees: provenance.attendees || [],
    agenda: extraction.agenda || "",
    timeline: asArray(extraction.timeline),
    decisions: asArray(extraction.decisions),
    actionItems: asArray(extraction.actionItems).map((a) => ({ status: "Pending", priority: "Medium", ...a })),
    risks: asArray(extraction.risks),
    openIssues: asArray(extraction.openIssues),
    clientConcerns: asArray(extraction.clientConcerns),
    commitments: asArray(extraction.commitments),
    nextMeeting: extraction.nextMeeting?.dateText
      ? extraction.nextMeeting
      : { dateText: "", confirmed: false },
    generatedAt: new Date().toISOString(),
    disclaimer: "Generated by FOI-MeetAI — verify before circulation",
    provenance: {
      extractionProvider: state.extractionProvider,
      verificationProvider: provenance.verifierProvider,
      sttProviders: [...state.sttProviders]
    },
    transcriptText: provenance.transcriptText,
    // segments omitted from the Sheet payload — transcript text is enough
  };
}

function transcriptFromState() {
  const merged = [...state.segments].sort((a, b) => a.startMs - b.startMs);
  const lines = merged.map((s) => {
    const totalSec = Math.round(s.startMs / 1000);
    const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
    const ss = String(totalSec % 60).padStart(2, "0");
    return `[${mm}:${ss}] ${s.speakerName || s.speakerLabel || "Unknown"}: ${s.text}`;
  });
  // Merge platform captions that audio STT missed entirely (screen-share-only
  // speakers etc.) — appended chronologically as extra source lines.
  const captions = state.contextEvents
    .filter((e) => e.type === "caption" && e.text)
    .map((e) => {
      const totalSec = Math.round(e.atMs / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      return `[${mm}:${ss}] ${e.name || "Unknown"} (caption): ${e.text}`;
    });
  return [...lines, ...captions].sort((a, b) => a.localeCompare(b)).join("\n");
}

async function stopAndProcess() {
  if (state.status !== "recording") throw new Error("Nothing is recording.");
  state.status = "processing";
  setBadge();
  await persist();

  // Final audio flush.
  chrome.runtime.sendMessage({ channel: "foi-offscreen", command: "stop" });
  await new Promise((r) => setTimeout(r, 2500));
  await chrome.alarms.clearAll();

  const settings = await loadSettings();
  const keys = populatedKeys(settings);

  try {
    // 1) Speaker/role resolution.
    let resolved = { segments: state.segments, attendees: [] };
    try {
      const res = await foiFetch(settings, "/api/diarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segments: state.segments,
          roster: state.roster,
          contextEvents: state.contextEvents,
          providerKeys: keys
        })
      });
      if (res.ok) resolved = await res.json();
    } catch (e) {
      debug({ msg: "diarize failed — continuing with raw labels", detail: e.message });
    }
    state.segments = resolved.segments?.length ? resolved.segments : state.segments;
    const attendees = resolved.attendees?.length
      ? resolved.attendees
      : state.roster.map((r) => ({ name: r.name, role: r.role || "unknown", organization: r.organization, confirmed: false }));

    // 2) FINAL full-transcript reprocessing pass.
    const transcriptText = transcriptFromState();
    const analyzeRes = await foiFetch(settings, "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: state.projectName,
        platform: state.platform,
        meetingDate: dateInKolkata(state.startedAtMs),
        meetingStartIso: new Date(state.startedAtMs).toISOString(),
        durationMinutes: Math.round(meetingMs() / 60000),
        roster: state.roster,
        transcriptText,
        previousExtraction: state.partialExtraction,
        providerKeys: keys,
        orderedLlmIds: settings.llmPriority,
        final: true
      })
    });
    if (!analyzeRes.ok) throw new Error(`final analyze failed (${analyzeRes.status}): ${(await analyzeRes.text()).slice(0, 200)}`);
    const analyzed = await analyzeRes.json();
    state.extractionProvider = analyzed.provider;

    // 3) Independent verification pass (accuracy gate).
    let verifiedJson = analyzed.extraction;
    let verifierProvider = null;
    try {
      const verifyRes = await foiFetch(settings, "/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcriptText,
          momJson: analyzed.extraction,
          extractionProviderId: analyzed.provider,
          providerKeys: keys
        })
      });
      if (verifyRes.ok) {
        const v = await verifyRes.json();
        verifiedJson = v.momJson;
        verifierProvider = v.verifierProvider;
      }
    } catch (e) {
      debug({ msg: "verify pass unavailable — extraction kept (all items flagged by confidence only)", detail: e.message });
    }

    // 4) Assemble MOM document.
    const mom = extractionToMom(verifiedJson, {
      preparedBy: settings.preparedBy,
      companyName: settings.companyName,
      attendees,
      verifierProvider,
      transcriptText
    });

    // 5) Google Sheet (primary deliverable).
    const token = await askGoogleToken(true);
    let sheetOut = null;
    if (token || token?.token) {
      const accessToken = token.token || token;
      const sheetsRes = await foiFetch(settings, "/api/mom/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleAccessToken: accessToken,
          spreadsheetId: settings.defaultSpreadsheetId || undefined,
          mom,
          logoUrl: settings.logoUrl || undefined,
          meetingId: state.meetingId
        })
      });
      if (!sheetsRes.ok) throw new Error(`sheets write failed: ${(await sheetsRes.text()).slice(0, 300)}`);
      sheetOut = await sheetsRes.json();

      // 6) Gmail draft (best-effort).
      let draftId = null;
      try {
        const recipients = attendees.map((a) => a.email).filter(Boolean);
        const gmailRes = await foiFetch(settings, "/api/mom/gmail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            googleAccessToken: accessToken,
            to: recipients,
            mom,
            sheetUrl: sheetOut.spreadsheetUrl
          })
        });
        if (gmailRes.ok) draftId = (await gmailRes.json()).draftId;
      } catch (e) {
        debug({ msg: "gmail draft skipped", detail: e.message });
      }

      cachedResult = {
        status: "done",
        meetingId: state.meetingId,
        projectName: state.projectName,
        sheetUrl: sheetOut.spreadsheetUrl,
        spreadsheetId: sheetOut.spreadsheetId,
        tabName: sheetOut.tabName,
        draftId,
        finishedAt: new Date().toISOString(),
        mom,
        debugLog: state.debugLog.slice(-100)
      };
    } else {
      cachedResult = {
        status: "needs_google_signin",
        meetingId: state.meetingId,
        projectName: state.projectName,
        mom,
        debugLog: state.debugLog.slice(-100)
      };
    }

    state.status = "done";
    setBadge();
    await persist();

    void chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "MOM ready",
      message: cachedResult.sheetUrl
        ? `Minutes for ${state.projectName} are in Google Sheets. Click the extension to open.`
        : `MOM generated for ${state.projectName} — sign in with Google to write it to Sheets.`
    });
    return cachedResult;
  } catch (err) {
    state.status = "error";
    state.error = err.message;
    setBadge();
    await persist();
    void chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "FOI-MeetAI error",
      message: err.message.slice(0, 180)
    });
    throw err;
  }
}

/* ------------------------------ messaging -------------------------------- */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    switch (msg?.channel) {
      case "foi-popup":
        if (msg.command === "start") return sendResponse(await captureWithErrors(msg));
        if (msg.command === "stop") return sendResponse(await stopWithErrors());
        if (msg.command === "getState") {
          return sendResponse({
            status: state.status,
            meetingId: state.meetingId,
            platform: state.platform,
            projectName: state.projectName,
            startedAtMs: state.startedAtMs,
            segmentCount: state.segments.length,
            error: state.error,
            result: cachedResult,
            debugLog: state.debugLog.slice(-50)
          });
        }
        if (msg.command === "retrySheets") return sendResponse(await retrySheetsWithErrors());
        break;

      case "foi-context":
        handleContextEvent(msg);
        return sendResponse({ ok: true });

      case "foi-offscreen-result":
        if (msg.kind === "chunk") handleChunkResult(msg);
        if (msg.kind === "failed") handleChunkFailed(msg);
        // persist in the background (throttled-ish: every 4th chunk)
        if ((state.segments.length & 3) === 0) await persist();
        return sendResponse({ ok: true });
    }
  })().catch(async (err) => {
    debug({ msg: "message handler error", detail: err.message });
    sendResponse({ error: err.message });
  });
  return true; // async response
});

async function captureWithErrors(msg) {
  try {
    return { ok: true, ...(await startCapture(msg)) };
  } catch (err) {
    state.status = "error";
    state.error = err.message;
    setBadge();
    return { ok: false, error: err.message };
  }
}

async function stopWithErrors() {
  try {
    return { ok: true, result: await stopAndProcess() };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function retrySheetsWithErrors() {
  // User signed in late: re-run ONLY the Sheet/PDF/Gmail steps with the
  // already-verified MOM — never reprocesses the transcript.
  try {
    if (!cachedResult?.mom) throw new Error("No MOM available yet.");
    const settings = await loadSettings();
    const token = await askGoogleToken(true);
    if (!token && !token?.token) throw new Error("Google sign-in did not complete.");
    const accessToken = token.token || token;
    const res = await foiFetch(settings, "/api/mom/sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        googleAccessToken: accessToken,
        spreadsheetId: settings.defaultSpreadsheetId || undefined,
        mom: cachedResult.mom,
        logoUrl: settings.logoUrl || undefined,
        meetingId: cachedResult.meetingId
      })
    });
    if (!res.ok) throw new Error((await res.text()).slice(0, 300));
    const out = await res.json();
    cachedResult = { ...cachedResult, status: "done", sheetUrl: out.spreadsheetUrl, tabName: out.tabName };
    await persist();
    return { ok: true, result: cachedResult };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ------------------------------- alarms ---------------------------------- */

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "foi-live-analysis") void runLiveAnalysis();
  if (alarm.name === "foi-screenshot") void captureScreenContext();
  if (alarm.name === "foi-keepalive") {
    // touch storage to keep the worker warm while recording
    if (state.status === "recording") void chrome.storage.session.set({ foiHeartbeat: Date.now() });
  }
});

chrome.runtime.onStartup.addListener(() => void rehydrate());
chrome.runtime.onInstalled.addListener(() => {
  setBadge();
  void chrome.runtime.openOptionsPage();
});

void rehydrate().then(setBadge);
