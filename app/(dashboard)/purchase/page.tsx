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
import type { PurchaseOrder, Project, Vendor } from "@/lib/types";

export default function PurchasePage() {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    project_id: "",
    vendor_id: "",
    notes: "",
    expected_delivery: "",
  });

  const fetchPOs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });
    setPos(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPOs();
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pRes, vRes] = await Promise.all([
        supabase.from("projects").select("id,name").eq("company_id", user.id),
        supabase.from("vendors").select("id,name").eq("company_id", user.id).eq("status", "active"),
      ]);
    if (pRes.data) setProjects(pRes.data as unknown as Project[]);
    if (vRes.data) setVendors(vRes.data as unknown as Vendor[]);
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count } = await supabase.from("purchase_orders").select("*", { count: "exact", head: true }).eq("company_id", user.id);
    const poNumber = generateNumber("PO", count || 0);

    await supabase.from("purchase_orders").insert({
      company_id: user.id,
      project_id: form.project_id,
      vendor_id: form.vendor_id,
      po_number: poNumber,
      notes: form.notes || null,
      expected_delivery: form.expected_delivery || null,
    });

    setSaving(false);
    setShowForm(false);
    setForm({ project_id: "", vendor_id: "", notes: "", expected_delivery: "" });
    fetchPOs();
  };

  const statusColors = (status: string) => {
    const m: Record<string, string> = {
      draft: "border-l-gray-400",
      sent_for_approval: "border-l-purple-400",
      approved: "border-l-yellow-400",
      issued: "border-l-green-400",
      cancelled: "border-l-red-400",
    };
    return m[status] || "border-l-gray-200";
  };

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500">{pos.length} purchase orders</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ New PO</Button>
      </div>

      {pos.length === 0 ? (
        <Card><div className="py-12 text-center"><p className="text-gray-500">No purchase orders yet.</p></div></Card>
      ) : (
        <div className="grid gap-4">
          {pos.map((po) => (
            <Link key={po.id} href={`/purchase/${po.id}`}>
              <Card className={`cursor-pointer border-l-4 ${statusColors(po.status)} transition-shadow hover:shadow-md`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{po.po_number}</h3>
                      <StatusBadge status={po.status} />
                    </div>
                    {po.notes && <p className="text-sm text-gray-500">{po.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(po.grand_total)}</p>
                    <p className="text-xs text-gray-500">{formatDate(po.created_at)}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Purchase Order" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Project" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} options={projects.map((p) => ({ value: p.id, label: p.name }))} required />
          <Select label="Vendor" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} options={vendors.map((v) => ({ value: v.id, label: v.name }))} required />
          <Input label="Expected Delivery" type="date" value={form.expected_delivery} onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })} />
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Create PO</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
