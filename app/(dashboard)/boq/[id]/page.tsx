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
import { formatCurrency } from "@/lib/utils";
import type { BOQ, BOQLineItem } from "@/lib/types";

export default function BOQDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [boq, setBoq] = useState<BOQ | null>(null);
  const [items, setItems] = useState<BOQLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemForm, setShowItemForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQLineItem | null>(null);
  const [itemForm, setItemForm] = useState({
    category: "",
    description: "",
    unit: "sqft",
    quantity: "",
    rate: "",
    labour_rate: "",
    labour_amount: "",
    remarks: "",
  });

  const fetchBOQ = useCallback(async () => {
    if (!id) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: boqData } = await supabase.from("boqs").select("*").eq("id", id).single();
    setBoq(boqData);

    const { data: itemsData } = await supabase.from("boq_line_items").select("*").eq("boq_id", id).order("created_at");
    setItems(itemsData || []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchBOQ(); }, [fetchBOQ]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (editingItem) {
      await supabase.from("boq_line_items").update({
        category: itemForm.category,
        description: itemForm.description,
        unit: itemForm.unit,
        quantity: parseFloat(itemForm.quantity),
        rate: parseFloat(itemForm.rate),
        labour_rate: itemForm.labour_rate ? parseFloat(itemForm.labour_rate) : null,
        labour_amount: itemForm.labour_amount ? parseFloat(itemForm.labour_amount) : null,
        remarks: itemForm.remarks || null,
      }).eq("id", editingItem.id);
    } else {
      await supabase.from("boq_line_items").insert({
        boq_id: id,
        category: itemForm.category,
        description: itemForm.description,
        unit: itemForm.unit,
        quantity: parseFloat(itemForm.quantity),
        rate: parseFloat(itemForm.rate),
        labour_rate: itemForm.labour_rate ? parseFloat(itemForm.labour_rate) : null,
        labour_amount: itemForm.labour_amount ? parseFloat(itemForm.labour_amount) : null,
        remarks: itemForm.remarks || null,
      });
    }

    setSaving(false);
    setShowItemForm(false);
    setEditingItem(null);
    setItemForm({ category: "", description: "", unit: "sqft", quantity: "", rate: "", labour_rate: "", labour_amount: "", remarks: "" });
    fetchBOQ();
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Delete this line item?")) return;
    await supabase.from("boq_line_items").delete().eq("id", itemId);
    fetchBOQ();
  };

  const totalMaterial = items.reduce((s, i) => s + i.amount, 0);
  const totalLabour = items.reduce((s, i) => s + (i.labour_amount || 0), 0);
  const grandTotal = totalMaterial + totalLabour;

  if (loading) return <Loading size="lg" />;
  if (!boq) return <div className="text-center py-12">BOQ not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{boq.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={boq.status} />
            <span className="text-sm text-gray-500">v{boq.version}</span>
          </div>
        </div>
        <Button onClick={() => { setEditingItem(null); setItemForm({ category: "", description: "", unit: "sqft", quantity: "", rate: "", labour_rate: "", labour_amount: "", remarks: "" }); setShowItemForm(true); }}>
          + Add Line Item
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Material Total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalMaterial)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Labour Total</p>
          <p className="text-2xl font-bold">{formatCurrency(totalLabour)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Grand Total</p>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(grandTotal)}</p>
        </Card>
      </div>

      {/* Items Table */}
      <Card title="Line Items">
        {items.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No line items. Click "+ Add Line Item" to start.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium text-right">Qty</th>
                  <th className="pb-2 font-medium text-right">Rate</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium text-right">Labour</th>
                  <th className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">{item.category}</td>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2">{item.unit}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2 text-right">{formatCurrency(item.rate)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                    <td className="py-2 text-right">{item.labour_amount ? formatCurrency(item.labour_amount) : "-"}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setItemForm({
                              category: item.category,
                              description: item.description,
                              unit: item.unit,
                              quantity: String(item.quantity),
                              rate: String(item.rate),
                              labour_rate: item.labour_rate ? String(item.labour_rate) : "",
                              labour_amount: item.labour_amount ? String(item.labour_amount) : "",
                              remarks: item.remarks || "",
                            });
                            setShowItemForm(true);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={5} className="py-2 text-right">Totals:</td>
                  <td className="py-2 text-right">{formatCurrency(totalMaterial)}</td>
                  <td className="py-2 text-right">{formatCurrency(totalLabour)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Item Form Modal */}
      <Modal open={showItemForm} onClose={() => { setShowItemForm(false); setEditingItem(null); }} title={editingItem ? "Edit Line Item" : "Add Line Item"} size="lg">
        <form onSubmit={handleAddItem} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
              options={[
                { value: "Civil Work", label: "Civil Work" },
                { value: "Flooring", label: "Flooring" },
                { value: "Ceiling", label: "Ceiling" },
                { value: "Electrical", label: "Electrical" },
                { value: "Plumbing", label: "Plumbing" },
                { value: "Painting", label: "Painting" },
                { value: "Modular Furniture", label: "Modular Furniture" },
                { value: "HVAC", label: "HVAC" },
                { value: "Fire Fighting", label: "Fire Fighting" },
                { value: "Other", label: "Other" },
              ]}
              required
            />
            <Select
              label="Unit"
              value={itemForm.unit}
              onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
              options={[
                { value: "sqft", label: "Sq Ft" },
                { value: "sqm", label: "Sq M" },
                { value: "nos", label: "Numbers" },
                { value: "rft", label: "Running Ft" },
                { value: "lump", label: "Lump Sum" },
                { value: "kg", label: "Kg" },
                { value: "litre", label: "Litre" },
              ]}
            />
          </div>
          <Input label="Description" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} required placeholder="e.g., 12mm Gypsum Board with framing" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity" type="number" step="0.01" value={itemForm.quantity} onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })} required />
            <Input label="Rate (₹)" type="number" step="0.01" value={itemForm.rate} onChange={(e) => setItemForm({ ...itemForm, rate: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Labour Rate (₹)" type="number" step="0.01" value={itemForm.labour_rate} onChange={(e) => setItemForm({ ...itemForm, labour_rate: e.target.value })} />
            <Input label="Labour Amount (₹)" type="number" step="0.01" value={itemForm.labour_amount} onChange={(e) => setItemForm({ ...itemForm, labour_amount: e.target.value })} />
          </div>
          <Input label="Remarks" value={itemForm.remarks} onChange={(e) => setItemForm({ ...itemForm, remarks: e.target.value })} />
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>{editingItem ? "Update" : "Add"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowItemForm(false); setEditingItem(null); }}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
