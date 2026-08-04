"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";

interface ProviderRow {
  id: string;
  displayName: string;
  task: string;
  configured: boolean;
  status: "working" | "rate_limited" | "invalid_key" | "unavailable" | "not_configured";
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastError?: string | null;
  cooldownUntil?: string | null;
}

const STATUS_META: Record<ProviderRow["status"], { icon: string; label: string; cls: string }> = {
  working: { icon: "✅", label: "Working", cls: "text-emerald-700" },
  rate_limited: { icon: "⚠️", label: "Rate-limited", cls: "text-amber-700" },
  invalid_key: { icon: "❌", label: "Invalid key", cls: "text-rose-700" },
  unavailable: { icon: "⚠️", label: "Unavailable", cls: "text-amber-700" },
  not_configured: { icon: "⬜", label: "Not configured", cls: "text-slate-400" },
};

export default function MeetingSettingsPage() {
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [vaultEnabled, setVaultEnabled] = useState(false);
  const [pendingKey, setPendingKey] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setRows(data.providers ?? []);
      setVaultEnabled(Boolean(data.vaultEnabled));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const testProvider = async (id: string) => {
    setTestResult((m) => ({ ...m, [id]: "testing…" }));
    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: id, apiKey: pendingKey[id] || undefined }),
      });
      const data = await res.json();
      setTestResult((m) => ({ ...m, [id]: data.message ?? (data.ok ? "✅ OK" : "❌ failed") }));
      void load();
    } catch (err) {
      setTestResult((m) => ({ ...m, [id]: (err as Error).message }));
    }
  };

  const saveKey = async (id: string) => {
    const apiKey = pendingKey[id];
    if (!apiKey) return;
    setSaving((m) => ({ ...m, [id]: "saving…" }));
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId: id, apiKey }),
      });
      const data = await res.json();
      setSaving((m) => ({ ...m, [id]: data.ok ? "Saved (encrypted) ✔" : data.error ?? "Save failed" }));
      if (data.ok) setPendingKey((m) => ({ ...m, [id]: "" }));
      void load();
    } catch (err) {
      setSaving((m) => ({ ...m, [id]: (err as Error).message }));
    }
  };

  if (loading) return <Loading />;

  const groups: Array<{ title: string; subtitle: string; task: string }> = [
    { title: "Speech-to-Text", subtitle: "Groq Whisper → Deepgram → AssemblyAI → OpenAI Whisper → Google STT → local whisper.cpp. Any ONE of these transcribes the meeting.", task: "stt" },
    { title: "LLM — MOM generation & verification", subtitle: "Gemini → Groq → OpenRouter → Claude → GPT-4o → DeepSeek → Ollama. Extraction and the independent accuracy-check prefer different model families automatically.", task: "llm" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Meeting AI Providers</h1>
        <p className="mt-1 text-sm text-slate-500">
          The router walks each chain top-to-bottom and silently fails over on rate-limits,
          quota, timeouts and auth errors. One working key per chain is enough; more keys mean more reliability.
        </p>
      </div>

      {!vaultEnabled && (
        <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800 ring-1 ring-sky-100">
          Server key vault is disabled (set <code className="rounded bg-white px-1">KEY_VAULT_SECRET</code> +
          Supabase to enable). Keys can still be supplied as deployment environment variables, or kept
          inside the Chrome extension (it sends them with each request).
        </p>
      )}

      {groups.map((group) => (
        <Card key={group.task} title={group.title} subtitle={group.subtitle}>
          <div className="space-y-3">
            {rows.filter((r) => r.task === group.task).map((row) => {
              const meta = STATUS_META[row.status];
              return (
                <div
                  key={row.id}
                  className="grid gap-3 rounded-xl border border-slate-100 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">{row.displayName}</span>
                      <span className={`text-xs font-bold ${meta.cls}`}>
                        {meta.icon} {meta.label}
                      </span>
                      {row.cooldownUntil && new Date(row.cooldownUntil) > new Date() && (
                        <span className="text-[11px] text-slate-400">
                          cooldown till {new Date(row.cooldownUntil).toLocaleTimeString("en-IN")}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Input
                        type="password"
                        placeholder={row.configured ? "Replace key…" : "Paste API key (or endpoint URL for local)…"}
                        value={pendingKey[row.id] ?? ""}
                        onChange={(e) => setPendingKey((m) => ({ ...m, [row.id]: e.target.value }))}
                        className="w-full max-w-sm"
                      />
                      <Button onClick={() => testProvider(row.id)}>Test Connection</Button>
                      {vaultEnabled && pendingKey[row.id] && (
                        <Button onClick={() => saveKey(row.id)} variant="secondary">Save to vault</Button>
                      )}
                    </div>
                    {testResult[row.id] && (
                      <p className="mt-1 text-xs font-medium text-slate-600">{testResult[row.id]}</p>
                    )}
                    {saving[row.id] && (
                      <p className="mt-1 text-xs font-medium text-emerald-700">{saving[row.id]}</p>
                    )}
                    {row.lastError && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-600">
                          debug · last error
                        </summary>
                        <p className="mt-1 break-all rounded bg-slate-50 p-2 font-mono text-[11px] text-slate-500">
                          {row.lastError}
                        </p>
                      </details>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
