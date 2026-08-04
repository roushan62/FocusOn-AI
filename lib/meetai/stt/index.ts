import { postForm, postJson, fetchWithTimeout, ProviderError, classifyHttpError } from "../http";
import { Provider } from "../provider-router";
import { TranscriptSegment } from "../types";

/**
 * Speech-to-text providers in default fallback order (spec Section 5.1):
 * Groq Whisper → Deepgram → AssemblyAI → OpenAI Whisper → Google STT →
 * local whisper.cpp/self-hosted endpoint.
 */

export interface STTRequest {
  audio: Buffer;
  /** e.g. "audio/webm;codecs=opus" coming off MediaRecorder */
  mimeType: string;
  filename: string;
  /** BCP-47 hints; mixed Hindi/English meetings pass ["hi","en"] */
  languageHints?: string[];
  /** offset of this chunk inside the meeting, used to build absolute timestamps */
  chunkStartMs: number;
  diarize?: boolean;
}

export interface STTResult {
  text: string;
  language?: string;
  segments: TranscriptSegment[];
  durationSeconds?: number;
}

type STTProvider = Provider<STTRequest, STTResult>;

function bufToFile(req: STTRequest): Blob {
  return new Blob([new Uint8Array(req.audio)], { type: req.mimeType });
}

function extFor(mime: string): string {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("wav")) return "wav";
  return "bin";
}

/* ------------------------------ Groq Whisper ----------------------------- */

function whisperCompatibleProvider(opts: {
  id: string;
  displayName: string;
  /** static URL, or a function building it from the resolved "key" (used by
   *  self-hosted endpoints where the key IS the base URL) */
  url: string | ((apiKey: string) => string);
  envKeys: string[];
  defaultModel: string;
  modelEnv: string;
  headers?: (apiKey: string) => Record<string, string>;
}): STTProvider {
  return {
    id: opts.id,
    displayName: opts.displayName,
    envKeys: opts.envKeys,
    async call(req, apiKey, ctx) {
      const url = typeof opts.url === "function" ? opts.url(apiKey) : opts.url;
      const form = new FormData();
      form.set("file", bufToFile(req), `chunk.${extFor(req.mimeType)}`);
      form.set("model", process.env[opts.modelEnv] || opts.defaultModel);
      form.set("response_format", "verbose_json");
      // Whisper accepts one language hint; mixed Hindi/English meetings are
      // best left auto-detected, so we only set it when a single hint exists.
      if (req.languageHints && req.languageHints.length === 1) {
        form.set("language", req.languageHints[0]);
      }
      const data = await postForm<{
        text?: string;
        language?: string;
        duration?: number;
        segments?: Array<{ start: number; end: number; text: string }>;
      }>(url, form, opts.headers ? opts.headers(apiKey) : { Authorization: `Bearer ${apiKey}` }, ctx.timeoutMs);
      if (typeof data.text !== "string") {
        throw new ProviderError("bad_response", "STT provider returned no text");
      }
      const segments: TranscriptSegment[] = (data.segments ?? []).map((s) => ({
        startMs: req.chunkStartMs + Math.round(s.start * 1000),
        endMs: req.chunkStartMs + Math.round(s.end * 1000),
        text: s.text.trim(),
        sttProvider: opts.id,
        language: data.language,
      }));
      return {
        text: data.text.trim(),
        language: data.language,
        durationSeconds: data.duration,
        segments: segments.length
          ? segments
          : [{
              startMs: req.chunkStartMs,
              endMs: req.chunkStartMs + Math.round((data.duration ?? 0) * 1000),
              text: data.text.trim(),
              sttProvider: opts.id,
              language: data.language,
            }],
      };
    },
  };
}

const groqWhisper = whisperCompatibleProvider({
  id: "groq_whisper",
  displayName: "Groq Whisper",
  url: "https://api.groq.com/openai/v1/audio/transcriptions",
  envKeys: ["GROQ_API_KEY"],
  defaultModel: "whisper-large-v3-turbo",
  modelEnv: "GROQ_WHISPER_MODEL",
});

const openaiWhisper = whisperCompatibleProvider({
  id: "openai_whisper",
  displayName: "OpenAI Whisper",
  url: "https://api.openai.com/v1/audio/transcriptions",
  envKeys: ["OPENAI_API_KEY"],
  defaultModel: "whisper-1",
  modelEnv: "OPENAI_WHISPER_MODEL",
});

/* -------------------------------- Deepgram -------------------------------- */

const deepgram: STTProvider = {
  id: "deepgram",
  displayName: "Deepgram Nova",
  envKeys: ["DEEPGRAM_API_KEY"],
  async call(req, apiKey, ctx) {
    const params = new URLSearchParams({
      model: process.env.DEEPGRAM_MODEL || "nova-2",
      smart_format: "true",
      diarize: String(req.diarize ?? true),
      detect_language: "true",
      utterances: "true",
    });
    const res = await fetchWithTimeout(
      `https://api.deepgram.com/v1/listen?${params.toString()}`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": req.mimeType,
        },
        body: new Uint8Array(req.audio),
      },
      ctx.timeoutMs
    );
    if (!res.ok) throw classifyHttpError(res.status, await res.text().catch(() => ""));
    const data = (await res.json().catch(() => null)) as {
      results?: {
        detected_language?: string;
        utterances?: Array<{
          start: number;
          end: number;
          transcript: string;
          speaker?: number;
          confidence?: number;
        }>;
        channels?: Array<{
          detected_language?: string;
          alternatives?: Array<{ transcript?: string }>;
        }>;
      };
      metadata?: { duration?: number };
    } | null;
    if (!data?.results) throw new ProviderError("bad_response", "Deepgram returned no results");
    const results = data.results;
    const utterances = results.utterances ?? [];
    const segments: TranscriptSegment[] = utterances.map((u) => ({
      startMs: req.chunkStartMs + Math.round(u.start * 1000),
      endMs: req.chunkStartMs + Math.round(u.end * 1000),
      speakerLabel: typeof u.speaker === "number" ? `Speaker ${String.fromCharCode(65 + (u.speaker % 26))}` : undefined,
      text: (u.transcript ?? "").trim(),
      sttProvider: "deepgram",
      confidence: u.confidence,
      language: results.channels?.[0]?.detected_language ?? results.detected_language,
    }));
    const text = utterances.length
      ? utterances.map((u) => u.transcript).join(" ")
      : results.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    return {
      text: text.trim(),
      language: results.channels?.[0]?.detected_language,
      durationSeconds: data.metadata?.duration,
      segments: segments.length
        ? segments
        : [{
            startMs: req.chunkStartMs,
            endMs: req.chunkStartMs + Math.round((data.metadata?.duration ?? 0) * 1000),
            text: text.trim(),
            sttProvider: "deepgram",
          }],
    };
  },
};

/* -------------------------------- AssemblyAI ------------------------------ */

const assemblyai: STTProvider = {
  id: "assemblyai",
  displayName: "AssemblyAI",
  envKeys: ["ASSEMBLYAI_API_KEY"],
  async call(req, apiKey, ctx) {
    // 1) upload audio
    const uploadRes = await fetchWithTimeout(
      "https://api.assemblyai.com/v2/upload",
      {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/octet-stream" },
        body: new Uint8Array(req.audio),
      },
      ctx.timeoutMs
    );
    if (!uploadRes.ok) throw classifyHttpError(uploadRes.status, await uploadRes.text().catch(() => ""));
    const { upload_url } = (await uploadRes.json()) as { upload_url?: string };
    if (!upload_url) throw new ProviderError("bad_response", "AssemblyAI upload failed");

    // 2) create transcript job
    const job = await postJson<{ id?: string }>(
      "https://api.assemblyai.com/v2/transcript",
      {
        audio_url: upload_url,
        speaker_labels: req.diarize ?? true,
        language_detection: true,
      },
      { Authorization: apiKey },
      ctx.timeoutMs
    );
    if (!job.id) throw new ProviderError("bad_response", "AssemblyAI job creation failed");

    // 3) poll within the shared provider timeout budget
    const deadline = Date.now() + ctx.timeoutMs;
    let last: Record<string, unknown> = {};
    while (Date.now() < deadline) {
      const pollRes = await fetchWithTimeout(
        `https://api.assemblyai.com/v2/transcript/${job.id}`,
        { headers: { Authorization: apiKey } },
        Math.min(15000, Math.max(2000, deadline - Date.now()))
      );
      if (!pollRes.ok) throw classifyHttpError(pollRes.status, await pollRes.text().catch(() => ""));
      last = (await pollRes.json()) as Record<string, unknown>;
      if (last.status === "completed") break;
      if (last.status === "error") {
        throw new ProviderError("bad_response", `AssemblyAI error: ${last.error}`);
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    if (last.status !== "completed") {
      throw new ProviderError("timeout", "AssemblyAI transcription did not finish in time");
    }
    const utterances = (last.utterances ?? []) as Array<{
      start: number; end: number; text: string; speaker?: string; confidence?: number;
    }>;
    const segments: TranscriptSegment[] = utterances.map((u) => ({
      startMs: req.chunkStartMs + u.start,
      endMs: req.chunkStartMs + u.end,
      speakerLabel: u.speaker ? `Speaker ${u.speaker}` : undefined,
      text: u.text.trim(),
      sttProvider: "assemblyai",
      confidence: u.confidence,
      language: last.language_code as string | undefined,
    }));
    const text = (last.text as string | undefined) ?? utterances.map((u) => u.text).join(" ");
    if (!text) throw new ProviderError("bad_response", "AssemblyAI returned empty transcript");
    return {
      text: text.trim(),
      language: last.language_code as string | undefined,
      segments: segments.length
        ? segments
        : [{ startMs: req.chunkStartMs, endMs: req.chunkStartMs, text: text.trim(), sttProvider: "assemblyai" }],
    };
  },
};

/* ------------------------------ Google Cloud STT -------------------------- */

const googleStt: STTProvider = {
  id: "google_stt",
  displayName: "Google Cloud Speech-to-Text",
  envKeys: ["GOOGLE_STT_API_KEY"],
  async call(req, apiKey, ctx) {
    const hints = req.languageHints?.length ? req.languageHints : ["hi-IN", "en-IN"];
    const data = await postJson<{
      results?: Array<{
        alternatives?: Array<{ transcript?: string; confidence?: number }>;
        languageCode?: string;
      }>;
    }>(
      `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`,
      {
        config: {
          languageCode: hints[0],
          alternativeLanguageCodes: hints.slice(1),
          enableAutomaticPunctuation: true,
          model: "latest_long",
        },
        audio: { content: req.audio.toString("base64") },
      },
      {},
      ctx.timeoutMs
    );
    const results = data.results ?? [];
    const text = results
      .map((r) => r.alternatives?.[0]?.transcript ?? "")
      .join(" ")
      .trim();
    if (!text) throw new ProviderError("bad_response", "Google STT returned empty transcript");
    const confidence = results[0]?.alternatives?.[0]?.confidence;
    return {
      text,
      language: results[0]?.languageCode,
      segments: [{
        startMs: req.chunkStartMs,
        endMs: req.chunkStartMs,
        text,
        sttProvider: "google_stt",
        confidence,
      }],
    };
  },
};

/* --------------------------- Local whisper.cpp ---------------------------- */

const localWhisper = whisperCompatibleProvider({
  id: "local_whisper",
  displayName: "Local Whisper (self-hosted)",
  url: (apiKey) => `${apiKey.replace(/\/$/, "")}/v1/audio/transcriptions`,
  envKeys: ["LOCAL_WHISPER_URL"],
  defaultModel: "whisper-1",
  modelEnv: "LOCAL_WHISPER_MODEL",
});

export const STT_PROVIDERS: STTProvider[] = [
  groqWhisper,
  deepgram,
  assemblyai,
  openaiWhisper,
  googleStt,
  localWhisper,
];
