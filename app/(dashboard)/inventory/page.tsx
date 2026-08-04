"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import type { InventoryItem, Material } from "@/lib/types";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ material_id: "", quantity_received: "0", quantity_consumed: "0", unit: "" });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [invRes, matRes] = await Promise.all([
      supabase.from("inventory").select("*").eq("company_id", user.id).order("last_updated", { ascending: false }),
      supabase.from("materials").select("*").eq("company_id", user.id),
    ]);
    setInventory(invRes.data || []);
    setMaterials(matRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const material = materials.find((m) => m.id === form.material_id);

    await supabase.from("inventory").insert({
      company_id: user.id,
      material_id: form.material_id,
      quantity_received: parseFloat(form.quantity_received),
      quantity_consumed: parseFloat(form.quantity_consumed),
      unit: form.unit || material?.unit || "sqft",
    });

    setSaving(false);
    setShowForm(false);
    setForm({ material_id: "", quantity_received: "0", quantity_consumed: "0", unit: "" });
    fetchData();
  };

  const lowStock = inventory.filter((i) => i.quantity_available < 10);

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500">{inventory.length} items</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Add Stock</Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <h3 className="font-semibold text-red-800">⚠ Low Stock Alerts</h3>
          <div className="mt-2 space-y-1">
            {lowStock.map((item) => {
              const mat = materials.find((m) => m.id === item.material_id);
              return (
                <p key={item.id} className="text-sm text-red-700">
                  {mat?.name || "Unknown"}: {item.quantity_available} {item.unit} remaining
                </p>
              );
            })}
          </div>
        </Card>
      )}

      {inventory.length === 0 ? (
        <Card><div className="py-12 text-center"><p className="text-gray-500">No inventory items yet.</p></div></Card>
      ) : (
        <div className="overflow-x-auto">
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 font-medium">Material</th>
                  <th className="pb-2 font-medium text-right">Received</th>
                  <th className="pb-2 font-medium text-right">Consumed</th>
                  <th className="pb-2 font-medium text-right">Available</th>
                  <th className="pb-2 font-medium">Unit</th>
                  <th className="pb-2 font-medium">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const mat = materials.find((m) => m.id === item.material_id);
                  const isLow = item.quantity_available < 10;
                  return (
                    <tr key={item.id} className={`border-b last:border-0 ${isLow ? "bg-red-50" : ""}`}>
                      <td className="py-2 font-medium">{mat?.name || "Unknown"}</td>
                      <td className="py-2 text-right">{item.quantity_received}</td>
                      <td className="py-2 text-right">{item.quantity_consumed}</td>
                      <td className={`py-2 text-right font-semibold ${isLow ? "text-red-600" : ""}`}>{item.quantity_available}</td>
                      <td className="py-2">{item.unit}</td>
                      <td className="py-2 text-gray-500">{new Date(item.last_updated).toLocaleDateString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add Stock Entry">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Material" value={form.material_id} onChange={(e) => { const m = materials.find((x) => x.id === e.target.value); setForm({ ...form, material_id: e.target.value, unit: m?.unit || "" }); }} options={materials.map((m) => ({ value: m.id, label: m.name }))} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Quantity Received" type="number" step="0.01" value={form.quantity_received} onChange={(e) => setForm({ ...form, quantity_received: e.target.value })} />
            <Input label="Quantity Consumed" type="number" step="0.01" value={form.quantity_consumed} onChange={(e) => setForm({ ...form, quantity_consumed: e.target.value })} />
          </div>
          <Input label="Unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required />
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Add Entry</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
