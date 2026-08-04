"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Project } from "@/lib/types";

interface DashboardStats {
  activeProjects: number;
  totalClients: number;
  pendingQuotations: number;
  lowStockItems: number;
  totalOutstanding: number;
  todayExpenses: number;
}

const EMPTY_STATS: DashboardStats = {
  activeProjects: 0,
  totalClients: 0,
  pendingQuotations: 0,
  lowStockItems: 0,
  totalOutstanding: 0,
  todayExpenses: 0,
};

export default function DashboardPage() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function fetchDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (active) setError("Workspace session unavailable. Refresh to reconnect.");
          return;
        }

        const today = new Date().toISOString().split("T")[0];
        const [projectsRes, clientsRes, quotationsRes, inventoryRes, invoicesRes, expensesRes] = await Promise.all([
          supabase.from("projects").select("*", { count: "exact" }).eq("company_id", user.id).in("status", ["planning", "in_progress"]).order("updated_at", { ascending: false }).limit(6),
          supabase.from("clients").select("id", { count: "exact" }).eq("company_id", user.id),
          supabase.from("quotations").select("id", { count: "exact" }).eq("company_id", user.id).eq("status", "draft"),
          supabase.from("inventory").select("id,quantity_available").eq("company_id", user.id).lt("quantity_available", 10),
          supabase.from("invoices").select("grand_total,amount_paid,status").eq("company_id", user.id).neq("status", "paid"),
          supabase.from("expenses").select("amount").eq("company_id", user.id).eq("expense_date", today),
        ]);

        const outstanding = (invoicesRes.data || []).reduce((sum, invoice) => sum + Number(invoice.grand_total || 0) - Number(invoice.amount_paid || 0), 0);
        const todayExpenses = (expensesRes.data || []).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        if (!active) return;
        setProjects((projectsRes.data || []) as Project[]);
        setStats({
          activeProjects: projectsRes.count || 0,
          totalClients: clientsRes.count || 0,
          pendingQuotations: quotationsRes.count || 0,
          lowStockItems: (inventoryRes.data || []).length,
          totalOutstanding: outstanding,
          todayExpenses,
        });
      } catch {
        if (active) setError("Some dashboard data could not be loaded. Your workspace is still available.");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchDashboard();
    return () => { active = false; };
  }, []);

  if (loading) return <Loading size="lg" message="Preparing your project control room…" />;

  const statCards = [
    { label: "Active projects", value: stats.activeProjects, href: "/projects", color: "sky", detail: "Planning + in progress" },
    { label: "Clients", value: stats.totalClients, href: "/clients", color: "emerald", detail: "Active relationships" },
    { label: "Draft quotations", value: stats.pendingQuotations, href: "/quotation", color: "amber", detail: "Awaiting issue" },
    { label: "Low-stock items", value: stats.lowStockItems, href: "/inventory", color: "rose", detail: "Below 10 units" },
    { label: "Outstanding", value: formatCurrency(stats.totalOutstanding), href: "/accounts", color: "orange", detail: "Receivables" },
    { label: "Today’s expenses", value: formatCurrency(stats.todayExpenses), href: "/accounts", color: "violet", detail: "Recorded today" },
  ];

  const colorClasses: Record<string, string> = {
    sky: "border-sky-100 bg-sky-50/70 text-sky-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    rose: "border-rose-100 bg-rose-50/70 text-rose-700",
    orange: "border-orange-100 bg-orange-50/70 text-orange-700",
    violet: "border-violet-100 bg-violet-50/70 text-violet-700",
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 rounded-2xl bg-slate-950 p-5 text-white shadow-xl shadow-slate-900/10 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Project control room</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Good morning, project team.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Track site progress, cash flow, procurement and client deliverables from one calm workspace built for commercial fit-outs.</p>
        </div>
        <Link href="/ai-chat" className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-sky-50">Ask the Copilot <span aria-hidden>→</span></Link>
      </div>

      {error && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href} className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${colorClasses[card.color]}`}>
            <p className="text-xs font-semibold leading-4 opacity-80">{card.label}</p>
            <p className="mt-3 break-words text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{card.value}</p>
            <p className="mt-1 text-[11px] font-medium opacity-70">{card.detail}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <Card title="Active project pipeline" subtitle="The projects that need attention next">
          {projects.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No active projects yet. Create your first project to start tracking delivery.</div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects/${project.id}`} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 transition hover:border-sky-200 hover:bg-sky-50/40 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-bold text-slate-900">{project.name}</p><StatusBadge status={project.status} /></div>
                    <p className="mt-1 truncate text-xs text-slate-500">{project.location || "Location not added"} · {project.area_sqft ? `${project.area_sqft.toLocaleString("en-IN")} sqft` : "Area pending"}</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right"><p className="text-sm font-bold text-slate-900">{project.budget ? formatCurrency(project.budget) : "Budget pending"}</p><p className="text-[11px] text-slate-400">Due {project.end_date ? formatDate(project.end_date) : "not set"}</p></div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Move work forward" subtitle="Shortcuts for the team">
          <div className="grid gap-2">
            <QuickAction href="/projects?new=1" label="Start a project" detail="Client, area, budget & dates" icon="＋" />
            <QuickAction href="/boq?new=1" label="Build a BOQ" detail="Material + labour costing" icon="▦" />
            <QuickAction href="/site" label="Log today’s DPR" detail="Progress, issues & labour" icon="⌂" />
            <QuickAction href="/accounts" label="Record a payment" detail="Keep receivables current" icon="₹" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function QuickAction({ href, label, detail, icon }: { href: string; label: string; detail: string; icon: string }) {
  return <Link href={href} className="group flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-sky-200 hover:bg-sky-50/50"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-700 group-hover:bg-sky-100 group-hover:text-sky-700">{icon}</span><span className="min-w-0"><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="block truncate text-xs text-slate-400">{detail}</span></span><span className="ml-auto text-slate-300 group-hover:text-sky-500">→</span></Link>;
}
