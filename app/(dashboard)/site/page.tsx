"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Loading } from "@/components/ui/Loading";
import { formatDate } from "@/lib/utils";
import type { SiteReport, Project } from "@/lib/types";

export default function SiteReportsPage() {
  const [reports, setReports] = useState<SiteReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    project_id: "",
    report_date: new Date().toISOString().split("T")[0],
    labour_count: "0",
    work_summary: "",
    issues: "",
    delays: "",
    weather: "",
  });
  const [error, setError] = useState("");

  const fetchReports = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("site_reports")
      .select("*")
      .eq("company_id", user.id)
      .order("report_date", { ascending: false });
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
    const loadProjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("projects").select("id,name").eq("company_id", user.id);
      if (data) setProjects(data as Project[]);
    };
    loadProjects();
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

    const { error: insertError } = await supabase.from("site_reports").insert({
      company_id: user.id,
      project_id: form.project_id,
      report_date: form.report_date,
      labour_count: parseInt(form.labour_count),
      work_summary: form.work_summary,
      issues: form.issues || null,
      delays: form.delays || null,
      weather: form.weather || null,
      created_by: user.id,
    });

    if (insertError) {
      setError(insertError.message || "Could not save the daily report.");
      setSaving(false);
      return;
    }

    setSaving(false);
    setShowForm(false);
    setForm({ project_id: "", report_date: new Date().toISOString().split("T")[0], labour_count: "0", work_summary: "", issues: "", delays: "", weather: "" });
    fetchReports();
  };

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Reports (DPR)</h1>
          <p className="text-sm text-gray-500">{reports.length} daily reports</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Daily Report</Button>
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {reports.length === 0 ? (
        <Card><div className="py-12 text-center"><p className="text-gray-500">No site reports yet.</p></div></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{formatDate(report.report_date)}</h3>
                <span className="text-sm text-gray-500">{report.labour_count} workers</span>
              </div>
              <p className="text-sm text-gray-700">{report.work_summary}</p>
              {report.issues && (
                <div className="rounded bg-red-50 p-2 text-sm text-red-700">
                  <strong>Issues:</strong> {report.issues}
                </div>
              )}
              {report.delays && (
                <div className="rounded bg-yellow-50 p-2 text-sm text-yellow-700">
                  <strong>Delays:</strong> {report.delays}
                </div>
              )}
              {report.weather && <p className="text-xs text-gray-400">Weather: {report.weather}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Daily Progress Report" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select label="Project" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} options={projects.map((p) => ({ value: p.id, label: p.name }))} required />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Date" type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required />
            <Input label="Labour Count" type="number" value={form.labour_count} onChange={(e) => setForm({ ...form, labour_count: e.target.value })} />
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Work Summary</label><textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={3} value={form.work_summary} onChange={(e) => setForm({ ...form, work_summary: e.target.value })} required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Issues</label><textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={form.issues} onChange={(e) => setForm({ ...form, issues: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Delays</label><textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={form.delays} onChange={(e) => setForm({ ...form, delays: e.target.value })} /></div>
          <Input label="Weather" value={form.weather} onChange={(e) => setForm({ ...form, weather: e.target.value })} placeholder="e.g., Sunny, 32°C" />
          <div className="flex gap-2"><Button type="submit" loading={saving}>Submit Report</Button><Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button></div>
        </form>
      </Modal>
    </div>
  );
}
