import { ContextEvent, TranscriptSegment } from "./types";

/** Transcript assembly utilities shared by API routes. */

export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function sortSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  return [...segments].sort((a, b) => a.startMs - b.startMs);
}

/** Merge adjacent segments from the same speaker within a small gap. */
export function mergeSegments(
  segments: TranscriptSegment[],
  maxGapMs = 1200
): TranscriptSegment[] {
  const sorted = sortSegments(segments);
  const merged: TranscriptSegment[] = [];
  for (const seg of sorted) {
    const last = merged[merged.length - 1];
    const sameSpeaker =
      last &&
      (seg.speakerName ?? seg.speakerLabel ?? "") ===
        (last.speakerName ?? last.speakerLabel ?? "");
    if (last && sameSpeaker && seg.startMs - last.endMs <= maxGapMs) {
      last.endMs = Math.max(last.endMs, seg.endMs);
      last.text = `${last.text} ${seg.text}`.replace(/\s+/g, " ").trim();
      if (seg.confidence != null) {
        last.confidence = last.confidence != null
          ? (last.confidence + seg.confidence) / 2
          : seg.confidence;
      }
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

export function applyContextEvents(
  segments: TranscriptSegment[],
  events: ContextEvent[]
): TranscriptSegment[] {
  // Attach DOM "currently speaking" names to segments when we have no
  // diarization name for them (spec Section 6.3b).
  const speaking = events
    .filter((e) => e.type === "speaking" && e.name)
    .sort((a, b) => a.atMs - b.atMs);
  if (!speaking.length) return segments;
  return segments.map((seg) => {
    if (seg.speakerName) return seg;
    // latest speaking event at or before the segment start
    let best: ContextEvent | undefined;
    for (const ev of speaking) {
      if (ev.atMs <= seg.startMs + 800) best = ev;
      else break;
    }
    return best?.name ? { ...seg, speakerName: best.name } : seg;
  });
}

/** The canonical text fed to the LLM: `[mm:ss] Name: text` lines. */
export function transcriptToText(segments: TranscriptSegment[]): string {
  return mergeSegments(segments)
    .map((seg) => {
      const who = seg.speakerName || seg.speakerLabel || "Unknown";
      return `[${formatClock(seg.startMs)}] ${who}: ${seg.text}`;
    })
    .join("\n");
}

export function rosterToText(
  roster: Array<{ name: string; role?: string; organization?: string }>
): string {
  return roster
    .map((r) => `${r.name} | ${r.role ?? "unknown"} | ${r.organization ?? ""}`.trim())
    .join("\n");
}
