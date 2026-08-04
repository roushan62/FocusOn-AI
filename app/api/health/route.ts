import { NextRequest, NextResponse } from "next/server";
import { LLM_PROVIDERS, LLMRequest } from "@/lib/meetai/llm";
import { STT_PROVIDERS } from "@/lib/meetai/stt";
import { recordFailure, recordSuccess } from "@/lib/meetai/provider-health";
import { assertApiAuth } from "@/lib/meetai/api-helpers";
import { ProviderError } from "@/lib/meetai/http";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * POST /api/health — "Test Connection" button backend (spec Section 9.3).
 * Body: { providerId, apiKey? } — runs the cheapest possible real call
 * (a 1-token LLM completion or a tiny silent WAV through STT).
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as { providerId?: string; apiKey?: string };
    if (!body.providerId) {
      return NextResponse.json({ ok: false, message: "providerId required" }, { status: 400 });
    }

    const llm = LLM_PROVIDERS.find((p) => p.id === body.providerId);
    if (llm) {
      const apiKey = body.apiKey || process.env[llm.envKeys[0]] || "";
      if (!apiKey) {
        return NextResponse.json({ ok: false, status: "not_configured", message: "No API key supplied" });
      }
      const probe: LLMRequest = {
        systemPrompt: "Reply with the single word: ok",
        userPrompt: "ping",
        maxTokens: 4,
        temperature: 0,
      };
      try {
        await llm.call(probe, apiKey, { userKeys: {}, timeoutMs: 15000, task: "llm_extract" });
        recordSuccess(llm.id, "llm_extract");
        return NextResponse.json({ ok: true, status: "working", message: `${llm.displayName} is reachable ✅` });
      } catch (err) {
        const kind = err instanceof ProviderError ? err.kind : "unavailable";
        recordFailure(llm.id, "llm_extract", kind, (err as Error).message);
        return NextResponse.json({
          ok: false,
          status: kind === "auth" ? "invalid_key" : kind,
          message: humanMessage(kind, (err as Error).message),
        });
      }
    }

    const stt = STT_PROVIDERS.find((p) => p.id === body.providerId);
    if (stt) {
      const apiKey = body.apiKey || process.env[stt.envKeys[0]] || "";
      if (!apiKey) {
        return NextResponse.json({ ok: false, status: "not_configured", message: "No API key supplied" });
      }
      try {
        // 0.5s of silence as a mono 16kHz WAV — cheap and sufficient to
        // validate auth + reachability of the transcription endpoint.
        await stt.call(
          {
            audio: makeSilentWav(8000, 4000),
            mimeType: "audio/wav",
            filename: "silence.wav",
            languageHints: ["en"],
            chunkStartMs: 0,
            diarize: false,
          },
          apiKey,
          { userKeys: {}, timeoutMs: 20000, task: "stt" }
        );
        recordSuccess(stt.id, "stt");
        return NextResponse.json({ ok: true, status: "working", message: `${stt.displayName} is reachable ✅` });
      } catch (err) {
        const kind = err instanceof ProviderError ? err.kind : "unavailable";
        recordFailure(stt.id, "stt", kind, (err as Error).message);
        const benignEmpty = (err as Error).message.includes("no text") || (err as Error).message.includes("empty");
        return NextResponse.json({
          ok: benignEmpty ? true : false,
          status: benignEmpty ? "working" : kind === "auth" ? "invalid_key" : kind,
          message: benignEmpty
            ? `${stt.displayName} is reachable ✅ (endpoint answered; silence has no words)`
            : humanMessage(kind, (err as Error).message),
        });
      }
    }

    return NextResponse.json({ ok: false, message: "Unknown provider id" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ ok: false, message: (err as Error).message }, { status: 500 });
  }
}

function humanMessage(kind: string, message: string): string {
  switch (kind) {
    case "auth": return "Invalid key ❌ — check the key and try again.";
    case "rate_limit": return "Reachable but rate-limited ⚠️ — it will still work via fallback chain.";
    case "quota": return "Quota exhausted ⚠️ — add credit or keep as fallback.";
    case "timeout": return "Timed out — check network / endpoint URL.";
    default: return message;
  }
}

/** Minimal PCM WAV generator (mono 16-bit silence). */
function makeSilentWav(sampleRate: number, samples: number): Buffer {
  const dataSize = samples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  return buf;
}
