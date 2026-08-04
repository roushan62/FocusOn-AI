"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface DashboardStats {
  activeProjects: number;
  totalClients: number;
  pendingQuotations: number;
  lowStockItems: number;
  totalOutstanding: number;
  todayExpenses: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    activeProjects: 0,
    totalClients: 0,
    pendingQuotations: 0,
    lowStockItems: 0,
    totalOutstanding: 0,
    todayExpenses: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const companyId = user.id;

        const [
          projectsRes,
          clientsRes,
          quotationsRes,
          inventoryRes,
          invoicesRes,
          expensesRes,
        ] = await Promise.all([
          supabase.from("projects").select("id", { count: "exact" }).eq("company_id", companyId).in("status", ["planning", "in_progress"]),
          supabase.from("clients").select("id", { count: "exact" }).eq("company_id", companyId),
          supabase.from("quotations").select("id", { count: "exact" }).eq("company_id", companyId).eq("status", "draft"),
          supabase.from("inventory").select("id").eq("company_id", companyId).lt("quantity_available", 10),
          supabase.from("invoices").select("grand_total,amount_paid").eq("company_id", companyId).neq("status", "paid"),
          supabase.from("expenses").select("amount").eq("company_id", companyId).eq("expense_date", new Date().toISOString().split("T")[0]),
        ]);

        const outstanding = (invoicesRes.data || []).reduce(
          (sum, inv) => sum + (inv.grand_total - (inv.amount_paid || 0)),
          0
        );

        const todayExp = (expensesRes.data || []).reduce(
          (sum, exp) => sum + exp.amount,
          0
        );

        setStats({
          activeProjects: projectsRes.count || 0,
          totalClients: clientsRes.count || 0,
          pendingQuotations: quotationsRes.count || 0,
          lowStockItems: (inventoryRes.data || []).length,
          totalOutstanding: outstanding,
          todayExpenses: todayExp,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) return <Loading size="lg" message="Loading dashboard..." />;

  const statCards = [
    { label: "Active Projects", value: stats.activeProjects, href: "/projects", color: "blue" },
    { label: "Total Clients", value: stats.totalClients, href: "/clients", color: "green" },
    { label: "Pending Quotations", value: stats.pendingQuotations, href: "/quotation", color: "yellow" },
    { label: "Low Stock Items", value: stats.lowStockItems, href: "/inventory", color: "red" },
    { label: "Outstanding (₹)", value: formatCurrency(stats.totalOutstanding), href: "/accounts", color: "orange" },
    { label: "Today's Expenses (₹)", value: formatCurrency(stats.todayExpenses), href: "/accounts", color: "purple" },
  ];

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Overview of your business</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="cursor-pointer transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-500">{card.label}</span>
                <span className="text-2xl font-bold">{card.value}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/projects/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Project
          </Link>
          <Link
            href="/clients/new"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            + New Client
          </Link>
          <Link
            href="/boq/new"
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            + New BOQ
          </Link>
          <Link
            href="/quotation/new"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            + New Quotation
          </Link>
        </div>
      </Card>
    </div>
  );
}
