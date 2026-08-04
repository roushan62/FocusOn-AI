"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { PurchaseOrder, POLineItem, Vendor, Project } from "@/lib/types";

export default function PODetailPage() {
  const { id } = useParams<{ id: string }>();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [items, setItems] = useState<POLineItem[]>([]);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [itemForm, setItemForm] = useState({
    description: "", unit: "sqft", quantity: "", rate: "",
  });
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: poData } = await supabase.from("purchase_orders").select("*").eq("id", id).single();
    if (!poData) { setLoading(false); return; }
    setPo(poData);

    const [itemsRes, vRes, pRes] = await Promise.all([
      supabase.from("po_line_items").select("*").eq("po_id", id).order("created_at"),
      supabase.from("vendors").select("*").eq("id", poData.vendor_id).single(),
      supabase.from("projects").select("*").eq("id", poData.project_id).single(),
    ]);

    setItems(itemsRes.data || []);
    if (vRes.data) setVendor(vRes.data as Vendor);
    if (pRes.data) setProject(pRes.data as Project);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const syncHeaderTotals = async () => {
    if (!id) return;
    const { data: lineItems } = await supabase.from("po_line_items").select("amount").eq("po_id", id);
    const subtotal = (lineItems || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const gstAmount = subtotal * 0.18;
    await supabase.from("purchase_orders").update({ subtotal, gst_amount: gstAmount, grand_total: subtotal + gstAmount }).eq("id", id);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("po_line_items").insert({
      po_id: id,
      description: itemForm.description.trim(),
      unit: itemForm.unit,
      quantity: parseFloat(itemForm.quantity),
      rate: parseFloat(itemForm.rate),
    });
    if (insertError) {
      setError(insertError.message || "Could not add the line item.");
      setSaving(false);
      return;
    }

    await syncHeaderTotals();
    setSaving(false);
    setShowItemForm(false);
    setItemForm({ description: "", unit: "sqft", quantity: "", rate: "" });
    fetchData();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("Delete this item?")) return;
    const { error: deleteError } = await supabase.from("po_line_items").delete().eq("id", itemId);
    if (deleteError) {
      setError(deleteError.message || "Could not delete the line item.");
      return;
    }
    await syncHeaderTotals();
    fetchData();
  };

  const handleStatusChange = async (newStatus: string) => {
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "issued") update.issued_date = new Date().toISOString().split("T")[0];
    if (newStatus === "approved") {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) update.approved_by = user.id;
    }
    await supabase.from("purchase_orders").update(update).eq("id", id);
    fetchData();
  };

  const totalAmount = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  if (loading) return <Loading size="lg" />;
  if (!po) return <div className="text-center py-12">Purchase Order not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PO: {po.po_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={po.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {po.status === "draft" && (
            <Button onClick={() => handleStatusChange("sent_for_approval")}>Send for Approval</Button>
          )}
          {po.status === "sent_for_approval" && (
            <Button onClick={() => handleStatusChange("approved")}>Approve</Button>
          )}
          {po.status === "approved" && (
            <Button onClick={() => handleStatusChange("issued")}>Issue PO</Button>
          )}
          {["draft", "sent_for_approval"].includes(po.status) && (
            <Button variant="danger" onClick={() => handleStatusChange("cancelled")}>Cancel</Button>
          )}
          <Button variant="outline" onClick={() => { setItemForm({ description: "", unit: "sqft", quantity: "", rate: "" }); setShowItemForm(true); }}>
            + Add Item
          </Button>
        </div>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 md:grid-cols-2">
        {vendor && (
          <Card title="Vendor">
            <div className="text-sm space-y-1">
              <p className="font-semibold">{vendor.name}</p>
              {vendor.contact_person && <p>{vendor.contact_person}</p>}
              {vendor.phone && <p>{vendor.phone}</p>}
              {vendor.gst_number && <p className="text-gray-500">GST: {vendor.gst_number}</p>}
            </div>
          </Card>
        )}
        {project && (
          <Card title="Project">
            <div className="text-sm space-y-1">
              <p className="font-semibold">{project.name}</p>
              {project.location && <p>{project.location}</p>}
            </div>
          </Card>
        )}
      </div>

      {po.expected_delivery && (
        <p className="text-sm text-gray-500">Expected Delivery: {formatDate(po.expected_delivery)}</p>
      )}

      <Card title="Line Items">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No items. Click "+ Add Item".</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2">Unit</th>
                  <th className="pb-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2">{item.unit}</td>
                    <td className="py-2 text-right">{formatCurrency(item.rate)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="py-2">
                      <button onClick={() => handleDeleteItem(item.id)} className="text-xs text-red-600">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={5} className="py-2 text-right">Total:</td>
                  <td className="py-2 text-right">{formatCurrency(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {po.notes && (
        <Card title="Notes">
          <p className="text-sm text-gray-600">{po.notes}</p>
        </Card>
      )}

      <Modal open={showItemForm} onClose={() => setShowItemForm(false)} title="Add Line Item">
        <form onSubmit={handleAddItem} className="space-y-4">
          <Input label="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="Quantity" type="number" step="0.01" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} required />
            <Select label="Unit" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} options={[
              { value: "sqft", label: "Sq Ft" }, { value: "sqm", label: "Sq M" }, { value: "nos", label: "Numbers" }, { value: "rft", label: "Running Ft" },
            ]} />
            <Input label="Rate (₹)" type="number" step="0.01" value={itemForm.rate} onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })} required />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Add Item</Button>
            <Button type="button" variant="ghost" onClick={() => setShowItemForm(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
