import { NextRequest, NextResponse } from "next/server";
import { runExtraction } from "@/lib/meetai/pipeline";
import { rosterToText, transcriptToText } from "@/lib/meetai/transcript";
import { assertApiAuth, jsonError, keysFromRequest, asInt, asString } from "@/lib/meetai/api-helpers";
import { ContextEvent, TranscriptSegment } from "@/lib/meetai/types";
import { applyContextEvents } from "@/lib/meetai/transcript";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/analyze
 * Runs structured MOM extraction over a transcript window (live pass) or the
 * full meeting (final pass). Body:
 * {
 *   projectName, platform, meetingDate, meetingStartIso, durationMinutes,
 *   roster: [{name, role?, organization?}],
 *   segments: TranscriptSegment[] (preferred) OR transcriptText: string,
 *   contextEvents?: ContextEvent[],
 *   previousExtraction?: object,
 *   final?: boolean
 * }
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as {
      projectName?: string;
      platform?: string;
      meetingDate?: string;
      meetingStartIso?: string;
      durationMinutes?: number;
      roster?: Array<{ name: string; role?: string; organization?: string }>;
      segments?: TranscriptSegment[];
      transcriptText?: string;
      contextEvents?: ContextEvent[];
      previousExtraction?: Record<string, unknown>;
      final?: boolean;
      providerKeys?: Record<string, string>;
      orderedLlmIds?: string[];
    };

    let transcript = body.transcriptText ?? "";
    if (!transcript && Array.isArray(body.segments) && body.segments.length) {
      const enriched = body.contextEvents?.length
        ? applyContextEvents(body.segments, body.contextEvents)
        : body.segments;
      transcript = transcriptToText(enriched);
    }
    if (!transcript.trim()) {
      return NextResponse.json({ error: "Transcript is empty" }, { status: 400 });
    }

    const now = new Date();
    const routed = await runExtraction(
      {
        meetingDate: body.meetingDate ?? now.toISOString().slice(0, 10),
        meetingStartIso: body.meetingStartIso ?? now.toISOString(),
        durationMinutes: asInt(body.durationMinutes, 0),
        platform: body.platform ?? "unknown",
        projectName: asString(body.projectName),
        rosterText: rosterToText(body.roster ?? []),
        transcript,
        isFinalPass: body.final === true,
        previousExtractionJson: body.previousExtraction
          ? JSON.stringify(body.previousExtraction)
          : undefined,
      },
      {
        userKeys: keysFromRequest(req, body.providerKeys),
        orderedIds: body.orderedLlmIds,
      }
    );

    return NextResponse.json({
      extraction: routed.result,
      provider: routed.providerId,
      attempts: routed.attempts,
      final: body.final === true,
    });
  } catch (err) {
    return jsonError(err);
  }
}
