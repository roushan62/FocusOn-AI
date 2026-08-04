"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { formatDate } from "@/lib/utils";

interface MeetingRow {
  id: string;
  title: string;
  project_name?: string;
  platform?: string;
  started_at: string;
  ended_at?: string;
  status: "recording" | "processing" | "done" | "error";
  spreadsheet_url?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  ms_teams: "MS Teams",
  unknown: "—",
};

function StatusPill({ status }: { status: MeetingRow["status"] }) {
  const styles: Record<string, string> = {
    recording: "bg-rose-50 text-rose-700 ring-rose-100",
    processing: "bg-amber-50 text-amber-700 ring-amber-100",
    done: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    error: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  const labels: Record<string, string> = {
    recording: "● Recording",
    processing: "Processing",
    done: "MOM Ready",
    error: "Error",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/meetings")
      .then(async (res) => {
        if (!res.ok) throw new Error(`Load failed (${res.status})`);
        return res.json();
      })
      .then((data) => setMeetings(data.meetings ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Meeting Intelligence</h1>
          <p className="mt-1 text-sm text-slate-500">
            FOI-MeetAI — record client meetings from the Chrome extension; verified Minutes of
            Meeting land in Google Sheets automatically.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/meetings/settings"
            className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Provider Settings &amp; Health
          </Link>
        </div>
      </div>

      <Card
        title="Recorded meetings"
        subtitle="Sessions captured by the FOI-MeetAI Chrome extension. Raw transcripts are archived for full traceability."
      >
        {error && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {error}. Meeting history appears here once Supabase is connected (optional — the extension works without it).
          </p>
        )}
        {!error && meetings.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
            <p className="text-3xl">🎙️</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">No meetings recorded yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Install the extension from the <code className="rounded bg-slate-100 px-1">extension/</code> folder,
              open a Google Meet / Zoom / Teams call, and press <strong>Start Meeting Assistant</strong>.
            </p>
          </div>
        )}
        {meetings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2 font-bold">Meeting</th>
                  <th className="px-3 py-2 font-bold">Project</th>
                  <th className="px-3 py-2 font-bold">Platform</th>
                  <th className="px-3 py-2 font-bold">Started</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                  <th className="px-3 py-2 font-bold">MOM</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 font-semibold text-slate-800">
                      <Link href={`/meetings/${m.id}`} className="hover:text-sky-700 hover:underline">
                        {m.title || "Meeting"}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{m.project_name || "—"}</td>
                    <td className="px-3 py-2.5 text-slate-600">{PLATFORM_LABELS[m.platform ?? "unknown"]}</td>
                    <td className="px-3 py-2.5 text-slate-600">{m.started_at ? formatDate(m.started_at) : "—"}</td>
                    <td className="px-3 py-2.5"><StatusPill status={m.status} /></td>
                    <td className="px-3 py-2.5">
                      {m.spreadsheet_url ? (
                        <a
                          href={m.spreadsheet_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-sky-700 hover:underline"
                        >
                          Open Sheet ↗
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
