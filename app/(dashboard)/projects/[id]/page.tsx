"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import type { Project, Client, BOQ, Quotation, SiteReport } from "@/lib/types";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [boqs, setBoqs] = useState<BOQ[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [reports, setReports] = useState<SiteReport[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: p } = await supabase.from("projects").select("*").eq("id", id).single();
    if (!p) { setLoading(false); return; }
    setProject(p);

    const [cRes, bRes, qRes, rRes] = await Promise.all([
      supabase.from("clients").select("*").eq("id", p.client_id).single(),
      supabase.from("boqs").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("quotations").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("site_reports").select("*").eq("project_id", id).order("report_date", { ascending: false }).limit(10),
    ]);

    if (cRes.data) setClient(cRes.data as Client);
    setBoqs((bRes.data || []) as BOQ[]);
    setQuotations((qRes.data || []) as Quotation[]);
    setReports((rRes.data || []) as SiteReport[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Loading size="lg" />;
  if (!project) return <div className="text-center py-12">Project not found.</div>;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        {client && <p className="text-sm text-gray-500 mt-1">Client: {client.name}</p>}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><p className="text-xs text-gray-500">Area</p><p className="text-lg font-bold">{project.area_sqft ? `${project.area_sqft} sqft` : "N/A"}</p></Card>
        <Card><p className="text-xs text-gray-500">Budget</p><p className="text-lg font-bold">{project.budget ? formatCurrency(project.budget) : "N/A"}</p></Card>
        <Card><p className="text-xs text-gray-500">Start</p><p className="text-lg font-bold">{project.start_date ? formatDate(project.start_date) : "N/A"}</p></Card>
        <Card><p className="text-xs text-gray-500">End</p><p className="text-lg font-bold">{project.end_date ? formatDate(project.end_date) : "N/A"}</p></Card>
      </div>

      {project.location && <Card><span className="text-sm text-gray-500">Location: </span><span className="text-sm font-medium">{project.location}</span></Card>}
      {project.description && <Card><p className="text-sm text-gray-600">{project.description}</p></Card>}

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="BOQs" actions={<Link href="/boq" className="text-xs text-blue-600">View All</Link>}>
          {boqs.length === 0 ? <p className="text-sm text-gray-500">No BOQs yet.</p> : (
            <div className="space-y-2">{boqs.slice(0, 5).map((b) => (
              <Link key={b.id} href={`/boq/${b.id}`} className="block rounded border p-2 text-sm hover:bg-gray-50">
                <div className="flex justify-between"><span className="font-medium">{b.title}</span><StatusBadge status={b.status} /></div>
              </Link>
            ))}</div>
          )}
        </Card>

        <Card title="Quotations" actions={<Link href="/quotation" className="text-xs text-blue-600">View All</Link>}>
          {quotations.length === 0 ? <p className="text-sm text-gray-500">No quotations yet.</p> : (
            <div className="space-y-2">{quotations.slice(0, 5).map((q) => (
              <Link key={q.id} href={`/quotation/${q.id}`} className="block rounded border p-2 text-sm hover:bg-gray-50">
                <div className="flex justify-between"><span className="font-medium">{q.quotation_number}</span><span className="font-bold">{formatCurrency(q.grand_total)}</span></div>
              </Link>
            ))}</div>
          )}
        </Card>
      </div>

      <Card title="Recent Site Reports" actions={<Link href="/site" className="text-xs text-blue-600">View All</Link>}>
        {reports.length === 0 ? <p className="text-sm text-gray-500">No reports yet.</p> : (
          <div className="space-y-2">{reports.map((r) => (
            <div key={r.id} className="rounded border p-3 text-sm">
              <div className="flex justify-between"><span className="font-medium">{formatDate(r.report_date)}</span><span>{r.labour_count} workers</span></div>
              <p className="text-gray-600 mt-1">{r.work_summary}</p>
            </div>
          ))}</div>
        )}
      </Card>
    </div>
  );
}
