import { NextRequest, NextResponse } from "next/server";
import { STT_PROVIDERS, STTRequest, STTResult } from "@/lib/meetai/stt";
import { callWithFallback } from "@/lib/meetai/provider-router";
import { assertApiAuth, jsonError, asInt } from "@/lib/meetai/api-helpers";
import { appendSegments, upsertMeeting } from "@/lib/meetai/store";
import { UserKeyMap } from "@/lib/meetai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/transcribe
 * Multipart form upload of a 15–20s audio chunk from the Chrome extension.
 * Fields: file (audio blob), meetingId, chunkStartMs, diarize,
 *         providerKeys (JSON string), languageHints (JSON string array),
 *         orderedSttIds (JSON string array, optional user priority order).
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio chunk too large (max 25MB)" }, { status: 413 });
    }

    const meetingId = String(form.get("meetingId") ?? "");
    const chunkStartMs = asInt(form.get("chunkStartMs"), 0);
    const diarize = String(form.get("diarize") ?? "true") !== "false";
    const providerKeys = safeJson<UserKeyMap>(form.get("providerKeys"), {});
    const languageHints = safeJson<string[]>(form.get("languageHints"), ["hi", "en"]);
    const orderedIds = safeJson<string[]>(form.get("orderedSttIds"), []);

    const audio = Buffer.from(await file.arrayBuffer());
    const sttReq: STTRequest = {
      audio,
      mimeType: file.type || "audio/webm",
      filename: "chunk.webm",
      languageHints,
      chunkStartMs,
      diarize,
    };

    const routed = await callWithFallback<STTRequest, STTResult>(
      "stt",
      sttReq,
      STT_PROVIDERS,
      { userKeys: providerKeys, timeoutMs: 30000, orderedIds }
    );

    const segments = routed.result.segments.map((s) => ({ ...s, sttProvider: routed.providerId }));

    // Best-effort persistence — never blocks or fails the meeting flow.
    void (async () => {
      if (meetingId) {
        await upsertMeeting({ id: meetingId, title: "Meeting", started_at: new Date().toISOString(), status: "recording" });
        await appendSegments(meetingId, segments);
      }
    })();

    return NextResponse.json({
      text: routed.result.text,
      segments,
      language: routed.result.language,
      provider: routed.providerId,
      attempts: routed.attempts,
    });
  } catch (err) {
    return jsonError(err);
  }
}

function safeJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
