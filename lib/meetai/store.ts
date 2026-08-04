import { MomDocument, TranscriptSegment } from "./types";

/**
 * Best-effort persistence to Supabase. Every function silently no-ops when
 * the workspace runs on the built-in local adapter — the meeting flow must
 * never depend on the database being present.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Supa = { from: (table: string) => any };

async function db(): Promise<Supa | null> {
  try {
    const { isUsingMockWorkspace, createServiceClient } = await import(
      "@/lib/supabase/client"
    );
    if (isUsingMockWorkspace()) return null;
    return createServiceClient() as unknown as Supa;
  } catch {
    return null;
  }
}

export interface MeetingRecord {
  id: string;
  title: string;
  project_name?: string;
  platform?: string;
  started_at: string;
  ended_at?: string;
  status: "recording" | "processing" | "done" | "error";
  spreadsheet_url?: string;
  mom_json?: MomDocument;
  provider_log?: unknown;
}

export async function upsertMeeting(record: Partial<MeetingRecord> & { id: string }) {
  const supabase = await db();
  if (!supabase) return;
  try {
    await supabase.from("meet_meetings").upsert(record, { onConflict: "id" });
  } catch {
    /* ignore */
  }
}

export async function appendSegments(meetingId: string, segments: TranscriptSegment[]) {
  const supabase = await db();
  if (!supabase || !segments.length) return;
  try {
    const rows = segments.map((s) => ({
      meeting_id: meetingId,
      start_ms: s.startMs,
      end_ms: s.endMs,
      speaker_label: s.speakerLabel ?? null,
      speaker_name: s.speakerName ?? null,
      role: s.role ?? null,
      text: s.text,
      stt_provider: s.sttProvider ?? null,
      confidence: s.confidence ?? null,
    }));
    await supabase.from("meet_transcript_segments").insert(rows);
  } catch {
    /* ignore */
  }
}

export async function listMeetings(): Promise<MeetingRecord[]> {
  const supabase = await db();
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("meet_meetings")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(100);
    return (data as MeetingRecord[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function getMeeting(id: string): Promise<{
  meeting: MeetingRecord | null;
  segments: TranscriptSegment[];
}> {
  const supabase = await db();
  if (!supabase) return { meeting: null, segments: [] };
  try {
    const { data: meeting } = await supabase
      .from("meet_meetings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    const { data: segs } = await supabase
      .from("meet_transcript_segments")
      .select("*")
      .eq("meeting_id", id)
      .order("start_ms", { ascending: true });
    return {
      meeting: (meeting as MeetingRecord | null) ?? null,
      segments: ((segs as Array<Record<string, any>> | null) ?? []).map((s) => ({
        startMs: s.start_ms,
        endMs: s.end_ms,
        speakerLabel: s.speaker_label ?? undefined,
        speakerName: s.speaker_name ?? undefined,
        role: s.role as TranscriptSegment["role"],
        text: s.text,
        sttProvider: s.stt_provider ?? undefined,
        confidence: s.confidence ?? undefined,
      })),
    };
  } catch {
    return { meeting: null, segments: [] };
  }
}

export async function readProviderHealth(): Promise<Array<Record<string, unknown>>> {
  const supabase = await db();
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("meet_provider_health").select("*").limit(100);
    return (data as Array<Record<string, unknown>> | null) ?? [];
  } catch {
    return [];
  }
}

export async function saveVaultKey(providerId: string, encrypted: string) {
  const supabase = await db();
  if (!supabase) throw new Error("Supabase is not configured — add keys via environment variables instead.");
  const { error } = await supabase
    .from("meet_api_key_vault")
    .upsert({ provider_id: providerId, encrypted_key: encrypted, updated_at: new Date().toISOString() }, { onConflict: "provider_id" });
  if (error) throw new Error(String((error as { message?: string }).message ?? "save failed"));
}

export async function readVaultKeys(): Promise<Record<string, string>> {
  const supabase = await db();
  if (!supabase) return {};
  try {
    const { data } = await supabase.from("meet_api_key_vault").select("provider_id, encrypted_key");
    const out: Record<string, string> = {};
    for (const row of (data as Array<{ provider_id: string; encrypted_key: string }> | null) ?? []) {
      try {
        const { decryptSecret } = await import("./vault");
        out[row.provider_id] = decryptSecret(row.encrypted_key);
      } catch {
        /* skip un-decryptable rows (rotated secret) */
      }
    }
    return out;
  } catch {
    return {};
  }
}
