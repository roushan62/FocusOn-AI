"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Vendor, Material } from "@/lib/types";

export default function VendorsMaterialsPage() {
  const [tab, setTab] = useState<"vendors" | "materials">("vendors");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    name: "", contact_person: "", email: "", phone: "", address: "", gst_number: "", category: "", rating: "3",
  });
  const [materialForm, setMaterialForm] = useState({
    name: "", category: "", unit: "sqft", description: "",
  });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [vRes, mRes] = await Promise.all([
      supabase.from("vendors").select("*").eq("company_id", user.id).order("name"),
      supabase.from("materials").select("*").eq("company_id", user.id).order("name"),
    ]);
    setVendors(vRes.data || []);
    setMaterials(mRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("vendors").insert({ company_id: user.id, ...vendorForm, rating: parseInt(vendorForm.rating) });
    setSaving(false);
    setShowVendorForm(false);
    setVendorForm({ name: "", contact_person: "", email: "", phone: "", address: "", gst_number: "", category: "", rating: "3" });
    fetchData();
  };

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("materials").insert({ company_id: user.id, ...materialForm });
    setSaving(false);
    setShowMaterialForm(false);
    setMaterialForm({ name: "", category: "", unit: "sqft", description: "" });
    fetchData();
  };

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendors & Materials</h1>
        <p className="text-sm text-gray-500">Manage your vendors and material database</p>
      </div>

      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab("vendors")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "vendors" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Vendors ({vendors.length})
        </button>
        <button
          onClick={() => setTab("materials")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === "materials" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Materials ({materials.length})
        </button>
      </div>

      {tab === "vendors" ? (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setShowVendorForm(true)}>+ Add Vendor</Button>
          </div>
          {vendors.length === 0 ? (
            <Card><p className="text-center text-gray-500 py-8">No vendors yet.</p></Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vendors.map((v) => (
                <Card key={v.id}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{v.name}</h3>
                      <StatusBadge status={v.status} />
                    </div>
                    {v.contact_person && <p className="text-sm text-gray-600">{v.contact_person}</p>}
                    {v.phone && <p className="text-sm text-gray-500">{v.phone}</p>}
                    {v.category && <p className="text-xs text-gray-400">{v.category}</p>}
                    <div className="flex items-center gap-1 mt-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} className={`h-4 w-4 ${i < v.rating ? "text-yellow-400" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <Modal open={showVendorForm} onClose={() => setShowVendorForm(false)} title="Add Vendor">
            <form onSubmit={handleAddVendor} className="space-y-4">
              <Input label="Vendor Name" value={vendorForm.name} onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Contact Person" value={vendorForm.contact_person} onChange={(e) => setVendorForm({ ...vendorForm, contact_person: e.target.value })} />
                <Input label="Phone" value={vendorForm.phone} onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })} />
              </div>
              <Input label="Email" type="email" value={vendorForm.email} onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })} />
              <Input label="Category" value={vendorForm.category} onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value })} placeholder="e.g., Electrical, Plumbing" />
              <Input label="Rating (1-5)" type="number" min="1" max="5" value={vendorForm.rating} onChange={(e) => setVendorForm({ ...vendorForm, rating: e.target.value })} />
              <div className="flex gap-2"><Button type="submit" loading={saving}>Add Vendor</Button><Button type="button" variant="ghost" onClick={() => setShowVendorForm(false)}>Cancel</Button></div>
            </form>
          </Modal>
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setShowMaterialForm(true)}>+ Add Material</Button>
          </div>
          {materials.length === 0 ? (
            <Card><p className="text-center text-gray-500 py-8">No materials yet.</p></Card>
          ) : (
            <div className="overflow-x-auto">
              <Card>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Unit</th>
                      <th className="pb-2">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{m.name}</td>
                        <td className="py-2">{m.category}</td>
                        <td className="py-2">{m.unit}</td>
                        <td className="py-2 text-gray-500">{m.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
          <Modal open={showMaterialForm} onClose={() => setShowMaterialForm(false)} title="Add Material">
            <form onSubmit={handleAddMaterial} className="space-y-4">
              <Input label="Material Name" value={materialForm.name} onChange={(e) => setMaterialForm({ ...materialForm, name: e.target.value })} required />
              <Input label="Category" value={materialForm.category} onChange={(e) => setMaterialForm({ ...materialForm, category: e.target.value })} required placeholder="e.g., Flooring, Electrical" />
              <Input label="Unit" value={materialForm.unit} onChange={(e) => setMaterialForm({ ...materialForm, unit: e.target.value })} />
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={materialForm.description} onChange={(e) => setMaterialForm({ ...materialForm, description: e.target.value })} /></div>
              <div className="flex gap-2"><Button type="submit" loading={saving}>Add Material</Button><Button type="button" variant="ghost" onClick={() => setShowMaterialForm(false)}>Cancel</Button></div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
