"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { BOQ, Project } from "@/lib/types";

interface PrefillItem {
  category?: string;
  description: string;
  unit?: string;
  quantity: number;
  rate: number;
  labour_rate?: number;
  remarks?: string;
}

const EMPTY_FORM = { project_id: "", title: "", notes: "" };

export default function BOQPage() {
  const [boqs, setBoqs] = useState<(BOQ & { total_amount?: number })[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [prefillItems, setPrefillItems] = useState<PrefillItem[]>([]);

  const fetchBOQs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase.from("boqs").select("*").eq("company_id", user.id).order("created_at", { ascending: false });
    const boqIds = (data || []).map((boq) => boq.id);
    const { data: lineItems } = boqIds.length
      ? await supabase.from("boq_line_items").select("boq_id,amount,labour_amount").in("boq_id", boqIds)
      : { data: [] };

    const totals = new Map<string, number>();
    (lineItems || []).forEach((item) => {
      totals.set(item.boq_id, (totals.get(item.boq_id) || 0) + Number(item.amount || 0) + Number(item.labour_amount || 0));
    });
    setBoqs((data || []).map((boq) => ({ ...boq, total_amount: totals.get(boq.id) || 0 })));
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    fetchBOQs();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data } = await supabase.from("projects").select("id,name").eq("company_id", user.id).order("name");
      if (active) setProjects((data || []) as Project[]);
    })();

    // The AI Copilot stores a reviewed draft in sessionStorage before routing
    // here. This keeps the navigation instant and avoids putting a large BOQ in
    // a URL.
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      setShowForm(true);
      const raw = sessionStorage.getItem("focuson_ai_boq_prefill");
      if (raw) {
        try {
          const draft = JSON.parse(raw) as { title?: string; notes?: string; items?: PrefillItem[] };
          setForm({ ...EMPTY_FORM, title: draft.title || "AI-generated Interior Fit-Out BOQ", notes: draft.notes || "" });
          setPrefillItems(Array.isArray(draft.items) ? draft.items : []);
          sessionStorage.removeItem("focuson_ai_boq_prefill");
        } catch {
          sessionStorage.removeItem("focuson_ai_boq_prefill");
        }
      }
    }

    return () => { active = false; };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Workspace session unavailable. Please refresh and try again.");
      setSaving(false);
      return;
    }

    const { data: created, error: insertError } = await supabase
      .from("boqs")
      .insert({
        company_id: user.id,
        project_id: form.project_id,
        title: form.title.trim(),
        notes: form.notes.trim() || null,
        created_by: user.id,
      })
      .select("*")
      .single();

    if (insertError || !created) {
      setError(insertError?.message || "Could not create the BOQ.");
      setSaving(false);
      return;
    }

    if (prefillItems.length > 0) {
      const lineItemPayload = prefillItems
        .filter((item) => item.description && item.quantity > 0 && item.rate >= 0)
        .map((item) => ({
          boq_id: created.id,
          category: item.category || "Other",
          description: item.description,
          unit: item.unit || "nos",
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          labour_rate: item.labour_rate == null ? null : Number(item.labour_rate),
          labour_amount: item.labour_rate == null ? null : Number(item.quantity) * Number(item.labour_rate),
          remarks: item.remarks || null,
        }));
      if (lineItemPayload.length > 0) await supabase.from("boq_line_items").insert(lineItemPayload);
    }

    setSaving(false);
    setShowForm(false);
    setForm(EMPTY_FORM);
    setPrefillItems([]);
    await fetchBOQs();
    window.history.replaceState({}, "", "/boq");
  };

  const filteredBOQs = boqs.filter((boq) =>
    `${boq.title} ${boq.notes || ""}`.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <Loading size="lg" message="Loading BOQs…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-600">Estimation & costing</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Bills of Quantities</h1>
          <p className="text-sm text-slate-500">{boqs.length} BOQs · material and labour cost visibility</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Input placeholder="Search BOQs…" value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 sm:w-56" />
          <Button onClick={() => { setForm(EMPTY_FORM); setPrefillItems([]); setShowForm(true); }}>+ New BOQ</Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {filteredBOQs.length === 0 ? (
        <Card><div className="py-12 text-center"><p className="text-slate-500">{search ? "No BOQs match your search." : "No BOQs yet. Create your first estimate."}</p></div></Card>
      ) : (
        <div className="grid gap-4">
          {filteredBOQs.map((boq) => (
            <Link key={boq.id} href={`/boq/${boq.id}`}>
              <Card className="cursor-pointer border-slate-200 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-950">{boq.title}</h3>
                      <StatusBadge status={boq.status} />
                      <span className="text-xs text-slate-400">v{boq.version}</span>
                    </div>
                    {boq.notes && <p className="line-clamp-2 text-sm text-slate-500">{boq.notes}</p>}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-bold text-slate-950">{formatCurrency(boq.total_amount || 0)}</p>
                    <p className="text-xs text-slate-500">{formatDate(boq.created_at)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setPrefillItems([]); }} title={prefillItems.length ? "Review AI-generated BOQ" : "New BOQ"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {prefillItems.length > 0 && <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-5 text-sky-800">{prefillItems.length} AI line items are ready. Select the project, review the title and save; you can edit every rate and quantity next.</div>}
          <Select label="Project" value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })} options={projects.map((project) => ({ value: project.id, label: project.name }))} required />
          <Input label="BOQ Title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required placeholder="e.g. Gypsum Ceiling & Flooring BOQ" />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500" rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Create BOQ</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setPrefillItems([]); }}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
