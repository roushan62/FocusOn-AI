/**
 * Shared configuration helpers for FOI-MeetAI extension.
 * Everything a non-technical user enters in Settings lives here
 * in chrome.storage.local — code is never edited after setup.
 */

export const DEFAULTS = {
  backendUrl: "", // e.g. https://focuson-ai.vercel.app — set in the wizard
  apiToken: "", // optional shared secret (MEETAI_API_TOKEN on the backend)
  companyName: "FocusOn Interiors Pvt. Ltd.",
  preparedBy: "",
  defaultSpreadsheetId: "",
  logoUrl: "",
  defaultProjectName: "",
  languageHints: ["hi", "en"],
  chunkSeconds: 18,
  analyzeEverySeconds: 120,
  screenshotEverySeconds: 45,
  providerKeys: {
    gemini: "",
    groq: "",
    openrouter: "",
    anthropic: "",
    openai: "",
    deepseek: "",
    ollama: "",
    groq_whisper: "",
    deepgram: "",
    assemblyai: "",
    openai_whisper: "",
    google_stt: "",
    local_whisper: ""
  },
  sttPriority: [], // optional re-ordering of provider ids
  llmPriority: [],
  roster: [] // [{name, role, organization, confirmed}]
};

const KEY = "foiSettings";

export async function loadSettings() {
  const stored = await chrome.storage.local.get(KEY);
  const merged = { ...DEFAULTS, ...(stored[KEY] || {}) };
  merged.providerKeys = { ...DEFAULTS.providerKeys, ...(stored[KEY]?.providerKeys || {}) };
  return merged;
}

export async function saveSettings(patch) {
  const current = await loadSettings();
  const next = { ...current, ...patch };
  if (patch.providerKeys) {
    next.providerKeys = { ...current.providerKeys, ...patch.providerKeys };
  }
  await chrome.storage.local.set({ [KEY]: next });
  return next;
}

/** HTTP helper with API-token header, used by offscreen + service worker. */
export function foiFetch(settings, path, init = {}) {
  const base = (settings.backendUrl || "").replace(/\/$/, "");
  if (!base) throw new Error("Backend URL is not configured — open the extension Settings wizard.");
  const headers = { ...(init.headers || {}) };
  if (settings.apiToken) headers["Authorization"] = `Bearer ${settings.apiToken}`;
  return fetch(`${base}${path}`, { ...init, headers });
}

/** Provider keys that are actually filled in — sent with each request. */
export function populatedKeys(settings) {
  const out = {};
  for (const [id, value] of Object.entries(settings.providerKeys || {})) {
    if (value) out[id] = value;
  }
  return out;
}
