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
import type { Project, Client } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    client_id: "",
    name: "",
    description: "",
    location: "",
    area_sqft: "",
    status: "planning" as const,
    start_date: "",
    end_date: "",
    budget: "",
  });

  const fetchProjects = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("company_id", user.id)
      .order("created_at", { ascending: false });

    setProjects(data || []);
    setLoading(false);
  };

  const fetchClients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("clients").select("id,name").eq("company_id", user.id);
    setClients((data || []) as unknown as Client[]);
  };

  useEffect(() => { fetchProjects(); fetchClients(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("projects").insert({
      company_id: user.id,
      client_id: form.client_id,
      name: form.name,
      description: form.description || null,
      location: form.location || null,
      area_sqft: form.area_sqft ? parseFloat(form.area_sqft) : null,
      status: form.status,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      budget: form.budget ? parseFloat(form.budget) : null,
    });

    setSaving(false);
    setShowForm(false);
    setForm({ client_id: "", name: "", description: "", location: "", area_sqft: "", status: "planning", start_date: "", end_date: "", budget: "" });
    fetchProjects();
  };

  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || "Unknown";
  };

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">{projects.length} projects</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ New Project</Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-gray-500">No projects yet. Create your first project.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="text-sm text-gray-600">{getClientName(project.client_id)}</p>
                  {project.location && <p className="text-sm text-gray-500">{project.location}</p>}
                  {project.area_sqft && (
                    <p className="text-sm text-gray-500">{project.area_sqft} sq ft</p>
                  )}
                  {project.budget && (
                    <p className="text-sm font-medium text-gray-700">{formatCurrency(project.budget)}</p>
                  )}
                  <p className="text-xs text-gray-400">Created {formatDate(project.created_at)}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Project" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Client"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            required
          />
          <Input label="Project Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input label="Area (sq ft)" type="number" value={form.area_sqft} onChange={(e) => setForm({ ...form, area_sqft: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
              options={[
                { value: "planning", label: "Planning" },
                { value: "in_progress", label: "In Progress" },
                { value: "on_hold", label: "On Hold" },
                { value: "completed", label: "Completed" },
              ]}
            />
            <Input label="Start Date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="End Date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <Input label="Budget (₹)" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
          <div className="flex gap-2">
            <Button type="submit" loading={saving}>Create Project</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
