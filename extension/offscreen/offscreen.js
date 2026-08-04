/**
 * Offscreen audio recorder (MV3 pattern): holds the tabCapture stream and a
 * MediaRecorder that restarts every N seconds so each chunk is a complete,
 * independently decodable WebM file (required by STT providers).
 *
 * Chunks are uploaded straight to the backend /api/transcribe. When the
 * network drops, chunks are parked in IndexedDB and flushed in order when
 * connectivity returns — a dropped connection never silently loses audio.
 */

let mediaStream = null;
let recorder = null;
let streamStartAt = 0;
let chunkStartedAt = 0;
let recording = false;
let cfg = null;
let meetingId = null;
let mimeType = "audio/webm";

const CHUNK_GRACE_MS = 900; // let the recorder flush before restarting

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}

/* ------------------------------ recording ------------------------------- */

async function start(streamId, settings, id) {
  if (recording) return;
  cfg = settings;
  meetingId = id;
  mimeType = pickMimeType();

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId }
    },
    video: false
  });

  // Keep tab audio audible for the user (capture is silent by default in
  // some Chrome versions when only an offscreen consumer exists).
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(mediaStream);
  source.connect(audioCtx.destination);
  window.__foiAudioCtx = audioCtx;

  streamStartAt = Date.now();
  recording = true;
  beginChunk();
}

function beginChunk() {
  if (!recording || !mediaStream) return;
  chunkStartedAt = Date.now() - streamStartAt;
  recorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
  let blob = null;
  let cancelled = false;

  recorder.ondataavailable = async (e) => {
    if (e.data && e.data.size > 0) blob = e.data;
  };
  recorder.onstop = () => {
    if (!cancelled && blob && blob.size > 1000) {
      void uploadChunk(blob, chunkStartedAt);
    }
    if (recording) beginChunk();
  };
  recorder.start();

  const seconds = Math.max(10, Math.min(30, cfg.chunkSeconds || 18));
  setTimeout(() => {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, seconds * 1000);

  window.__foiCurrentRecorder = recorder;
  window.__foiCancelCurrent = () => { cancelled = true; };
}

async function stop() {
  recording = false;
  try { window.__foiCancelCurrent = null; } catch (_) {}
  if (recorder && recorder.state !== "inactive") recorder.stop();
  await new Promise((r) => setTimeout(r, CHUNK_GRACE_MS));
  try {
    mediaStream?.getTracks().forEach((t) => t.stop());
    await window.__foiAudioCtx?.close();
  } catch (_) { /* shutdown best-effort */ }
  mediaStream = null;
}

/* ------------------------------- upload --------------------------------- */

function backendUrl() {
  return (cfg.backendUrl || "").replace(/\/$/, "");
}

async function uploadChunk(blob, chunkStartMs, attempt = 0) {
  const form = new FormData();
  form.set("file", blob, `chunk.${mimeType.includes("ogg") ? "ogg" : "webm"}`);
  form.set("meetingId", meetingId);
  form.set("chunkStartMs", String(chunkStartMs));
  form.set("diarize", "true");
  form.set("providerKeys", JSON.stringify(cfg.providerKeys || {}));
  form.set("languageHints", JSON.stringify(cfg.languageHints || ["hi", "en"]));
  form.set("orderedSttIds", JSON.stringify(cfg.orderedSttIds || []));

  const headers = {};
  if (cfg.apiToken) headers["Authorization"] = `Bearer ${cfg.apiToken}`;

  try {
    const res = await fetch(`${backendUrl()}/api/transcribe`, { method: "POST", headers, body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // The router already exhausted every configured provider on the server
      // side; empty speech is benign but transport-level failures are queued.
      if (res.status >= 500 || res.status === 429) throw new Error(data.error || `HTTP ${res.status}`);
      postResult({ kind: "failed", error: data.error || `HTTP ${res.status}` });
      return;
    }
    postResult({
      kind: "chunk",
      text: data.text || "",
      segments: data.segments || [],
      provider: data.provider,
      attempts: data.attempts
    });
    // A successful round-trip is a good moment to flush anything parked.
    void flushQueue();
  } catch (err) {
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
      return uploadChunk(blob, chunkStartMs, attempt + 1);
    }
    await parkChunk(blob, chunkStartMs, err.message);
  }
}

function postResult(payload) {
  chrome.runtime.sendMessage({ channel: "foi-offscreen-result", ...payload }, () => void chrome.runtime.lastError);
}

/* ----------------------------- offline queue ----------------------------- */

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("foi-meetai", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("queue", { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function parkChunk(blob, chunkStartMs, reason) {
  try {
    const db = await openDb();
    const tx = db.transaction("queue", "readwrite");
    tx.objectStore("queue").put({ blob, chunkStartMs, reason, meetingId, at: Date.now() });
    await new Promise((r) => { tx.oncomplete = r; tx.onerror = r; });
    postResult({ kind: "failed", error: `network down — chunk queued (${reason})` });
  } catch (_) { /* IndexedDB unavailable — very unlikely; keep meeting going */ }
}

async function flushQueue() {
  let db;
  try { db = await openDb(); } catch (_) { return; }
  const rows = await new Promise((resolve) => {
    const out = [];
    const tx = db.transaction("queue", "readonly");
    const cursor = tx.objectStore("queue").openCursor();
    cursor.onsuccess = () => {
      if (cursor.result) {
        out.push({ key: cursor.result.key, value: cursor.result.value });
        cursor.result.continue();
      } else resolve(out);
    };
    cursor.onerror = () => resolve(out);
  });
  for (const row of rows) {
    if (row.value.meetingId !== meetingId) continue;
    try {
      const form = new FormData();
      form.set("file", row.value.blob, "chunk.webm");
      form.set("meetingId", meetingId);
      form.set("chunkStartMs", String(row.value.chunkStartMs));
      form.set("diarize", "true");
      form.set("providerKeys", JSON.stringify(cfg.providerKeys || {}));
      form.set("languageHints", JSON.stringify(cfg.languageHints || []));
      form.set("orderedSttIds", JSON.stringify(cfg.orderedSttIds || []));
      const headers = {};
      if (cfg.apiToken) headers["Authorization"] = `Bearer ${cfg.apiToken}`;
      const res = await fetch(`${backendUrl()}/api/transcribe`, { method: "POST", headers, body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json().catch(() => ({}));
      postResult({ kind: "chunk", text: data.text || "", segments: data.segments || [], provider: data.provider });
      const delTx = db.transaction("queue", "readwrite");
      delTx.objectStore("queue").delete(row.key);
      await new Promise((r) => { delTx.oncomplete = r; });
    } catch (_) {
      return; // still offline — stop flushing
    }
  }
}

/* ------------------------------ messaging -------------------------------- */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.channel !== "foi-offscreen") return false;
  (async () => {
    if (msg.command === "start") {
      await start(msg.streamId, msg.settings, msg.meetingId);
      sendResponse({ ok: true });
    }
    if (msg.command === "stop") {
      await stop();
      sendResponse({ ok: true });
    }
  })().catch((err) => sendResponse({ ok: false, error: err.message }));
  return true;
});

setInterval(() => { void flushQueue(); }, 60000);
window.addEventListener("online", () => { void flushQueue(); });
