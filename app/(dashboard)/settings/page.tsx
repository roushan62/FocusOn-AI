"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Loading } from "@/components/ui/Loading";
import type { Company } from "@/lib/types";

export default function SettingsPage() {
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    gst_number: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    terms_template: "",
  });

  useEffect(() => {
    async function fetchCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("companies")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setCompany(data);
        setForm({
          name: data.name || "",
          gst_number: data.gst_number || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          website: data.website || "",
          terms_template: data.terms_template || "",
        });
      }
      setLoading(false);
    }

    fetchCompany();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("companies")
      .update(form)
      .eq("id", user.id);

    if (error) {
      setMessage("Error: " + error.message);
    } else {
      setMessage("Settings saved successfully!");
    }

    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  };

  if (loading) return <Loading size="lg" />;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Company Settings</h1>
        <p className="text-sm text-gray-500">Manage your company profile and defaults</p>
        {company?.updated_at && <p className="mt-1 text-xs text-slate-400">Last synced {new Date(company.updated_at).toLocaleString("en-IN")}</p>}
      </div>

      <Card title="Company Profile">
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Company Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="GST Number"
              value={form.gst_number}
              onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
              placeholder="27AABCG1234A1Z5"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              label="Website"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
        </form>
      </Card>

      <Card title="Default Terms & Conditions">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Terms Template
            </label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={4}
              value={form.terms_template}
              onChange={(e) => setForm({ ...form, terms_template: e.target.value })}
              placeholder="Enter default terms and conditions for quotations..."
            />
          </div>

          {message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                message.includes("Error")
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {message}
            </div>
          )}

          <Button onClick={handleSave} loading={saving}>
            Save Settings
          </Button>
        </div>
      </Card>
    </div>
  );
}
