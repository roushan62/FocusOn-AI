/**
 * Options-page setup wizard logic. Provider keys live in chrome.storage and
 * travel with each request (never hardcoded anywhere), so the very same
 * build works with any combination of free/paid keys (spec Section 5 & 9).
 */
import { loadSettings, saveSettings } from "../lib/config.js";

const STT_PROVIDERS = [
  { id: "groq_whisper", label: "Groq Whisper (free tier, fast)", hint: "Shares the Groq key — console.groq.com" },
  { id: "deepgram", label: "Deepgram Nova (free tier · diarization)", hint: "console.deepgram.com" },
  { id: "assemblyai", label: "AssemblyAI (free tier · diarization + Hindi)", hint: "assemblyai.com/dashboard" },
  { id: "openai_whisper", label: "OpenAI Whisper (paid)", hint: "Shares the OpenAI key — platform.openai.com" },
  { id: "google_stt", label: "Google Cloud Speech-to-Text", hint: "API key from Google Cloud Console" },
  { id: "local_whisper", label: "Local Whisper endpoint (offline fallback)", hint: "Base URL, e.g. http://localhost:8080" }
];

const LLM_PROVIDERS = [
  { id: "gemini", label: "Google Gemini (generous free tier)", hint: "aistudio.google.com/apikey" },
  { id: "groq", label: "Groq Llama 3.3 (free tier, very fast)", hint: "console.groq.com" },
  { id: "openrouter", label: "OpenRouter (one key → many models)", hint: "openrouter.ai/keys — great safety net" },
  { id: "anthropic", label: "Anthropic Claude (paid · best verifier)", hint: "console.anthropic.com" },
  { id: "openai", label: "OpenAI GPT-4o / 4o-mini (paid)", hint: "platform.openai.com/api-keys" },
  { id: "deepseek", label: "DeepSeek (very cheap paid)", hint: "platform.deepseek.com" },
  { id: "ollama", label: "Ollama self-hosted (offline)", hint: "Base URL, e.g. http://localhost:11434" }
];

const $ = (id) => document.getElementById(id);
let settings;

function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 2600);
}

function renderProviders(list, containerId) {
  const box = $(containerId);
  box.innerHTML = "";
  for (const p of list) {
    const row = document.createElement("div");
    row.className = "keyrow";
    row.innerHTML = `
      <div>
        <div class="name">${p.label}</div>
        <div class="meta">${p.hint}</div>
      </div>
      <input type="password" data-provider="${p.id}" placeholder="${p.id.includes("local") || p.id === "ollama" ? "Endpoint URL" : "Paste API key"}" />
      <button class="ghost" data-test="${p.id}">Test Connection</button>
      <span class="result" data-result="${p.id}"></span>`;
    box.appendChild(row);
  }
  box.addEventListener("click", async (e) => {
    const id = e.target?.dataset?.test;
    if (!id) return;
    await testProvider(id);
  });
}

function valueFor(id) {
  const el = document.querySelector(`input[data-provider="${id}"]`);
  return el ? el.value.trim() : "";
}

async function testProvider(id) {
  const resultEl = document.querySelector(`span[data-result="${id}"]`);
  const apiKey = valueFor(id) || settings.providerKeys?.[id] || "";
  if (!apiKey) {
    resultEl.textContent = "⬜ paste a key first";
    resultEl.className = "result warn";
    return;
  }
  resultEl.textContent = "testing…";
  resultEl.className = "result";
  try {
    const base = settings.backendUrl.replace(/\/$/, "");
    const res = await fetch(`${base}/api/health`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.apiToken ? { Authorization: `Bearer ${settings.apiToken}` } : {})
      },
      body: JSON.stringify({ providerId: id, apiKey })
    });
    const data = await res.json();
    const ok = data.ok === true;
    resultEl.textContent = data.message || (ok ? "✅ working" : "❌ failed");
    resultEl.className = "result " + (ok ? "ok" : data.status === "rate_limited" || data.status === "quota" ? "warn" : "bad");
  } catch (err) {
    resultEl.textContent = "❌ " + err.message;
    resultEl.className = "result bad";
  }
}

async function collectAndSave() {
  const providerKeys = { ...settings.providerKeys };
  document.querySelectorAll("input[data-provider]").forEach((el) => {
    const v = el.value.trim();
    if (v) providerKeys[el.dataset.provider] = v;
  });
  const analyzeSel = parseInt($("analyzeEverySeconds").value, 10);
  const shotSel = parseInt($("screenshotEverySeconds").value, 10);
  settings = await saveSettings({
    backendUrl: $("backendUrl").value.trim(),
    apiToken: $("apiToken").value.trim(),
    companyName: $("companyName").value.trim() || "FocusOn Interiors Pvt. Ltd.",
    preparedBy: $("preparedBy").value.trim(),
    logoUrl: $("logoUrl").value.trim(),
    defaultSpreadsheetId: $("defaultSpreadsheetId").value.trim(),
    languageHints: $("languageHints").value.split(",").map((s) => s.trim()).filter(Boolean),
    defaultProjectName: $("defaultProjectName").value.trim(),
    analyzeEverySeconds: Number.isFinite(analyzeSel) ? analyzeSel : 120,
    screenshotEverySeconds: Number.isFinite(shotSel) ? shotSel : 45,
    providerKeys
  });
  // Clear the password boxes after saving so the screen stays clean.
  document.querySelectorAll("input[data-provider]").forEach((el) => { el.value = ""; });
  toast("Saved ✔ — the extension is ready. Open a meeting and press Start.");
}

async function testBackend() {
  const el = $("backendResult");
  const url = $("backendUrl").value.trim().replace(/\/$/, "");
  if (!url) { el.textContent = "enter the URL first"; el.className = "result warn"; return; }
  el.textContent = "testing…"; el.className = "result";
  try {
    const res = await fetch(`${url}/api/ai/chat`, { method: "GET" });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok !== false) {
      el.textContent = "✅ backend reachable";
      el.className = "result ok";
    } else {
      el.textContent = `responded with status ${res.status}`;
      el.className = "result warn";
    }
  } catch (err) {
    el.textContent = "❌ " + err.message;
    el.className = "result bad";
  }
}

(async function init() {
  settings = await loadSettings();
  renderProviders(STT_PROVIDERS, "sttKeys");
  renderProviders(LLM_PROVIDERS, "llmKeys");
  $("backendUrl").value = settings.backendUrl || "";
  $("apiToken").value = settings.apiToken || "";
  $("companyName").value = settings.companyName || "";
  $("preparedBy").value = settings.preparedBy || "";
  $("logoUrl").value = settings.logoUrl || "";
  $("defaultSpreadsheetId").value = settings.defaultSpreadsheetId || "";
  $("languageHints").value = (settings.languageHints || []).join(",");
  $("defaultProjectName").value = settings.defaultProjectName || "";
  $("analyzeEverySeconds").value = String(settings.analyzeEverySeconds || 120);
  $("screenshotEverySeconds").value = String(settings.screenshotEverySeconds ?? 45);

  // Show which keys are already stored (masked) instead of asking again.
  for (const p of [...STT_PROVIDERS, ...LLM_PROVIDERS]) {
    if (settings.providerKeys?.[p.id]) {
      const el = document.querySelector(`span[data-result="${p.id}"]`);
      if (el) { el.textContent = "✅ key saved"; el.className = "result ok"; }
    }
  }

  $("saveAll").addEventListener("click", collectAndSave);
  $("testBackend").addEventListener("click", testBackend);
})();
