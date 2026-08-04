import { NextRequest, NextResponse } from "next/server";
import { runRoleInference } from "@/lib/meetai/pipeline";
import { applyContextEvents } from "@/lib/meetai/transcript";
import { assertApiAuth, jsonError, keysFromRequest } from "@/lib/meetai/api-helpers";
import { Attendee, ContextEvent, TranscriptSegment } from "@/lib/meetai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/diarize — speaker/role resolution (spec Section 6.3).
 * Combines (a) STT diarization labels, (b) DOM "currently speaking" events
 * captured by the platform adapter, and (c) the user-tagged roster.
 * Body: { segments, roster, contextEvents } → resolved segments + attendees.
 */
export async function POST(req: NextRequest) {
  const unauth = assertApiAuth(req);
  if (unauth) return unauth;

  try {
    const body = (await req.json()) as {
      segments?: TranscriptSegment[];
      roster?: Array<{ name: string; role?: string; organization?: string; confirmed?: boolean }>;
      contextEvents?: ContextEvent[];
      providerKeys?: Record<string, string>;
    };
    const roster = body.roster ?? [];
    const rosterByName = new Map(roster.map((r) => [r.name.toLowerCase(), r]));

    let segments = body.segments ?? [];
    if (body.contextEvents?.length) {
      segments = applyContextEvents(segments, body.contextEvents);
    }

    // Attach roles from the confirmed roster. Diarization speaker labels are
    // preserved so the UI can show "Speaker A" where no name was resolved.
    segments = segments.map((s) => {
      const match = s.speakerName ? rosterByName.get(s.speakerName.toLowerCase()) : undefined;
      return match?.role ? { ...s, role: match.role as TranscriptSegment["role"] } : s;
    });

    // Best-effort LLM role inference for roster names without a role —
    // never guesses: unknown stays unknown (spec Section 8.4).
    const unknowns = roster.filter((r) => !r.role || r.role === "unknown");
    if (unknowns.length) {
      const cues = unknowns.map((r) => ({
        name: r.name,
        organization: r.organization,
        sampleQuotes: segments
          .filter((s) => s.speakerName?.toLowerCase() === r.name.toLowerCase())
          .slice(0, 3)
          .map((s) => s.text),
      }));
      const inferred = await runRoleInference(cues, {
        userKeys: keysFromRequest(req, body.providerKeys),
      });
      for (const assignment of inferred) {
        const target = rosterByName.get(assignment.name.toLowerCase());
        if (target && assignment.role && assignment.role !== "unknown") {
          target.role = assignment.role;
          target.organization = target.organization || assignment.organization;
        }
      }
    }

    const attendees: Attendee[] = roster.map((r) => ({
      name: r.name,
      organization: r.organization,
      role: r.role ?? "unknown",
      confirmed: r.confirmed === true,
    }));

    return NextResponse.json({ segments, attendees });
  } catch (err) {
    return jsonError(err);
  }
}
