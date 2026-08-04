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

export default function BOQPage() {
  const [boqs, setBoqs] = useState<(BOQ & { total_amount?: number })[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ project_id: "", title: "", notes: "" });
  const [search, setSearch] = useState("");

  const fetchBOQs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("boqs")
      .select("*")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });

    // Fetch totals for each BOQ
    const boqsWithTotals = await Promise.all(
      (data || []).map(async (boq) => {
        const { data: items } = await supabase
          .from("boq_line_items")
          .select("amount, labour_amount")
          .eq("boq_id", boq.id);
        const total = (items || []).reduce(
          (sum, i) => sum + i.amount + (i.labour_amount || 0),
          0
        );
        return { ...boq, total_amount: total };
      })
    );

    setBoqs(boqsWithTotals);
    setLoading(false);
  };

  useEffect(() => {
    fetchBOQs();
    supabase.from("projects").select("id,name").then(({ data }) => {
      if (data) setProjects(data as Project[]);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("boqs").insert({
      company_id: user.id,
      project_id: form.project_id,
      title: form.title,
      notes: form.notes || null,
      created_by: user.id,
    });

    setSaving(false);
    setShowForm(false);
    setForm({ project_id: "", title: "", notes: "" });
    fetchBOQs();
  };

  const filteredBOQs = boqs.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bill of Quantities</h1>
          <p className="text-sm text-gray-500">{boqs.length} BOQs</p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search BOQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => setShowForm(true)}>+ New BOQ</Button>
        </div>
      </div>

      {filteredBOQs.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-gray-500">No BOQs found. Create your first BOQ.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBOQs.map((boq) => (
            <Link key={boq.id} href={`/boq/${boq.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{boq.title}</h3>
                      <StatusBadge status={boq.status} />
                      <span className="text-xs text-gray-400">v{boq.version}</span>
                    </div>
                    {boq.notes && <p className="text-sm text-gray-500">{boq.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(boq.total_amount || 0)}
                    </p>
                    <p className="text-xs text-gray-500">{formatDate(boq.created_at)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New BOQ" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Project"
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            required
          />
          <Input label="BOQ Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g., Gypsum Ceiling & Flooring BOQ" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Create BOQ</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
