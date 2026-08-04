"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Client } from "@/lib/types";

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [form, setForm] = useState({
    name: "",
    contact_person: "",
    email: "",
    phone: "",
    address: "",
    gst_number: "",
    notes: "",
    status: "active" as "active" | "inactive",
  });
  const [error, setError] = useState("");

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });

    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchClients();
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") setShowForm(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Workspace session unavailable. Please refresh and try again.");
      setSaving(false);
      return;
    }

    const payload = { ...form, company_id: user.id };
    const result = editingClient
      ? await supabase.from("clients").update(payload).eq("id", editingClient.id)
      : await supabase.from("clients").insert(payload);

    if (result.error) {
      setError(result.error.message || "Could not save the client.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    setEditingClient(null);
    setForm({ name: "", contact_person: "", email: "", phone: "", address: "", gst_number: "", notes: "", status: "active" });
    fetchClients();
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      contact_person: client.contact_person || "",
      email: client.email || "",
      phone: client.phone || "",
      address: client.address || "",
      gst_number: client.gst_number || "",
      notes: client.notes || "",
      status: client.status,
    });
    setShowForm(true);
  };

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500">{clients.length} clients</p>
        </div>
        <Button
          onClick={() => {
            setEditingClient(null);
            setForm({ name: "", contact_person: "", email: "", phone: "", address: "", gst_number: "", notes: "", status: "active" });
            setShowForm(true);
          }}
        >
          + Add Client
        </Button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {clients.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-gray-500">No clients yet. Add your first client to get started.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="border-slate-200 transition-shadow hover:shadow-md">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/clients/${client.id}`} className="min-w-0 truncate font-semibold text-slate-950 hover:text-sky-700">{client.name}</Link>
                  <StatusBadge status={client.status} />
                </div>
                {client.contact_person && <p className="text-sm text-slate-600">{client.contact_person}</p>}
                {client.phone && <p className="text-sm text-slate-500">{client.phone}</p>}
                {client.email && <p className="truncate text-sm text-slate-500">{client.email}</p>}
                <p className="text-xs text-slate-400">Added {formatDate(client.created_at)}</p>
                <div className="flex gap-3 border-t border-slate-100 pt-3 text-xs font-semibold">
                  <Link href={`/clients/${client.id}`} className="text-sky-700 hover:text-sky-900">View details →</Link>
                  <button type="button" onClick={() => handleEdit(client)} className="text-slate-500 hover:text-slate-900">Edit</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditingClient(null); }} title={editingClient ? "Edit Client" : "Add Client"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Client Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Contact Person" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="GST Number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>{editingClient ? "Update" : "Create"}</Button>
            <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingClient(null); }}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
