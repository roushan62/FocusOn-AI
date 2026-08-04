"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { formatClock } from "@/lib/meetai/transcript";
import type { MomDocument, TranscriptSegment } from "@/lib/meetai/types";

interface MeetingDetail {
  meeting: {
    id: string;
    title: string;
    project_name?: string;
    platform?: string;
    started_at: string;
    status: string;
    spreadsheet_url?: string;
    mom_json?: MomDocument;
  } | null;
  segments: TranscriptSegment[];
}

function Flag({ active }: { active?: string }) {
  if (!active) return null;
  return (
    <span className="ml-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800" title={active}>
      ⚠ verify
    </span>
  );
}

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<MeetingDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!params?.id) return;
    fetch(`/api/meetings/${params.id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Meeting not found" : `Load failed (${res.status})`);
        return res.json();
      })
      .then(setDetail)
      .catch((err) => setError(err.message));
  }, [params?.id]);

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</p>
        <Link href="/meetings" className="mt-4 inline-block text-sm font-semibold text-sky-700 hover:underline">
          ← Back to meetings
        </Link>
      </div>
    );
  }
  if (!detail) return <Loading />;

  const mom = detail.meeting?.mom_json;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <Link href="/meetings" className="text-xs font-semibold text-sky-700 hover:underline">← All meetings</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
          {detail.meeting?.title || "Meeting"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {detail.meeting?.project_name || "No project"} ·{" "}
          {detail.meeting?.started_at ? new Date(detail.meeting.started_at).toLocaleString("en-IN") : "—"}
          {detail.meeting?.spreadsheet_url && (
            <>
              {" · "}
              <a href={detail.meeting.spreadsheet_url} target="_blank" rel="noreferrer" className="font-semibold text-sky-700 hover:underline">
                Open MOM in Google Sheets ↗
              </a>
            </>
          )}
        </p>
      </div>

      {mom && (
        <>
          <Card title="Decisions" subtitle="Each decision carries a transcript source quote — nothing unverified reaches the Sheet.">
            <ul className="space-y-2">
              {(mom.decisions ?? []).map((d, i) => (
                <li key={i} className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-800">
                  <span className="font-semibold">{i + 1}.</span> {d.decision}
                  <Flag active={d.verificationFlag} />
                  {d.sourceQuote && (
                    <p className="mt-1 text-[11px] italic text-slate-400">[{d.sourceTimestamp}] “{d.sourceQuote}”</p>
                  )}
                </li>
              ))}
              {!mom.decisions?.length && <p className="text-sm text-slate-400">No decisions recorded.</p>}
            </ul>
          </Card>

          <Card title="Action items">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-2">Owner</th>
                    <th className="px-2 py-2">Task</th>
                    <th className="px-2 py-2">Due</th>
                    <th className="px-2 py-2">Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {(mom.actionItems ?? []).map((a, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${a.confidence === "Low" || a.verificationFlag ? "bg-amber-50/60" : ""}`}>
                      <td className="px-2 py-2 font-semibold text-slate-800">{a.owner}</td>
                      <td className="px-2 py-2 text-slate-700">
                        {a.task}
                        <Flag active={a.verificationFlag} />
                        {a.dueDateInferred && (
                          <span className="ml-1 text-[10px] font-semibold text-amber-700">(inferred date)</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-slate-600">{a.dueDate || "—"}</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          a.priority === "High" ? "bg-rose-50 text-rose-700" :
                          a.priority === "Medium" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"
                        }`}>
                          {a.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!mom.actionItems?.length && (
                    <tr><td colSpan={4} className="px-2 py-3 text-slate-400">No action items recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Card
        title="Raw transcript"
        subtitle="Source of truth — every MOM line quotes this. Low STT-confidence rows are dimmed."
      >
        {!detail.segments.length ? (
          <p className="text-sm text-slate-400">
            Transcript segments appear here when Supabase is connected; otherwise the transcript
            lives inside the hidden Sheet tab.
          </p>
        ) : (
          <div className="max-h-[480px] space-y-1 overflow-y-auto font-mono text-[13px] leading-6">
            {detail.segments.map((s, i) => (
              <p key={i} className={s.confidence != null && s.confidence < 0.5 ? "text-slate-400" : "text-slate-700"}>
                <span className="text-slate-400">[{formatClock(s.startMs)}]</span>{" "}
                <span className="font-bold">{s.speakerName || s.speakerLabel || "Unknown"}:</span> {s.text}
              </p>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
