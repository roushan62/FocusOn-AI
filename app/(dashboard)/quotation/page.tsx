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
import { formatDate, formatCurrency, generateNumber } from "@/lib/utils";
import Link from "next/link";
import type { Quotation, Project, BOQ } from "@/lib/types";

export default function QuotationPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [boqs, setBoqs] = useState<BOQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    project_id: "",
    boq_id: "",
    discount_percent: "0",
    profit_margin_percent: "15",
    valid_until: "",
  });

  const fetchQuotations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("quotations")
      .select("*")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });
    setQuotations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotations();
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pRes, bRes] = await Promise.all([
        supabase.from("projects").select("id,name").eq("company_id", user.id),
        supabase.from("boqs").select("id,title").eq("company_id", user.id).eq("status", "approved"),
      ]);
      if (pRes.data) setProjects(pRes.data as Project[]);
      if (bRes.data) setBoqs(bRes.data as BOQ[]);
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Calculate totals from BOQ items
    let subtotal = 0;
    if (form.boq_id) {
      const { data: items } = await supabase
        .from("boq_line_items")
        .select("amount, labour_amount")
        .eq("boq_id", form.boq_id);
      subtotal = (items || []).reduce(
        (sum, i) => sum + (i.amount || 0) + (i.labour_amount || 0), 0
      );
    }

    const profitMargin = (subtotal * parseFloat(form.profit_margin_percent || "0")) / 100;
    const afterProfit = subtotal + profitMargin;
    const discount = (afterProfit * parseFloat(form.discount_percent || "0")) / 100;
    const afterDiscount = afterProfit - discount;
    const gstAmount = (afterDiscount * 18) / 100;
    const grandTotal = afterDiscount + gstAmount;

    const { count } = await supabase.from("quotations").select("*", { count: "exact", head: true }).eq("company_id", user.id);
    const qNumber = generateNumber("QTN", count || 0);

    await supabase.from("quotations").insert({
      company_id: user.id,
      project_id: form.project_id,
      boq_id: form.boq_id || null,
      quotation_number: qNumber,
      subtotal,
      discount_percent: parseFloat(form.discount_percent),
      discount_amount: discount,
      profit_margin_percent: parseFloat(form.profit_margin_percent),
      gst_percent: 18,
      gst_amount: gstAmount,
      grand_total: grandTotal,
      valid_until: form.valid_until || null,
    });

    setSaving(false);
    setShowForm(false);
    setForm({ project_id: "", boq_id: "", discount_percent: "0", profit_margin_percent: "15", valid_until: "" });
    fetchQuotations();
  };

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500">{quotations.length} quotations</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ New Quotation</Button>
      </div>

      {quotations.length === 0 ? (
        <Card><div className="py-12 text-center"><p className="text-gray-500">No quotations yet.</p></div></Card>
      ) : (
        <div className="grid gap-4">
          {quotations.map((q) => (
            <Link key={q.id} href={`/quotation/${q.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{q.quotation_number}</h3>
                      <StatusBadge status={q.status} />
                    </div>
                    <p className="text-sm text-gray-500">Rev {q.revision}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(q.grand_total)}</p>
                    <p className="text-xs text-gray-500">{formatDate(q.created_at)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Quotation" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Project"
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            required
          />
          <Select
            label="BOQ (Optional)"
            value={form.boq_id}
            onChange={(e) => setForm({ ...form, boq_id: e.target.value })}
            options={boqs.map((b) => ({ value: b.id, label: b.title }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Discount %" type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} />
            <Input label="Profit Margin %" type="number" value={form.profit_margin_percent} onChange={(e) => setForm({ ...form, profit_margin_percent: e.target.value })} />
          </div>
          <Input label="Valid Until" type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Generate Quotation</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
