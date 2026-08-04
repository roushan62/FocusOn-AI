"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [projectData, setProjectData] = useState<{ name: string; revenue: number; expenses: number }[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<{ name: string; value: number }[]>([]);
  const [totals, setTotals] = useState({ revenue: 0, expenses: 0, outstanding: 0 });

  useEffect(() => {
    async function fetchReportData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [invRes, expRes, projRes] = await Promise.all([
        supabase.from("invoices").select("project_id,grand_total,amount_paid,status").eq("company_id", user.id),
        supabase.from("expenses").select("project_id,category,amount").eq("company_id", user.id),
        supabase.from("projects").select("id,name").eq("company_id", user.id),
      ]);

      const projects = projRes.data || [];
      const invoices = invRes.data || [];
      const expenses = expRes.data || [];

      // Per-project breakdown
      const projBreakdown = projects.map((p) => {
        const revenue = invoices.filter((i) => i.project_id === p.id).reduce((s, i) => s + (i.grand_total || 0), 0);
        const exp = expenses.filter((e) => e.project_id === p.id).reduce((s, e) => s + e.amount, 0);
        return { name: p.name, revenue, expenses: exp };
      });
      setProjectData(projBreakdown);

      // Expense by category
      const catMap: Record<string, number> = {};
      expenses.forEach((e) => {
        catMap[e.category] = (catMap[e.category] || 0) + e.amount;
      });
      setExpensesByCategory(Object.entries(catMap).map(([name, value]) => ({ name, value })));

      // Totals
      const totalRev = invoices.reduce((s, i) => s + (i.grand_total || 0), 0);
      const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
      const outstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + ((i.grand_total || 0) - (i.amount_paid || 0)), 0);
      setTotals({ revenue: totalRev, expenses: totalExp, outstanding });

      setLoading(false);
    }
    fetchReportData();
  }, []);

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Business analytics and reports</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Revenue</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.revenue)}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-red-600">{formatCurrency(totals.expenses)}</p></Card>
        <Card><p className="text-sm text-gray-500">Outstanding</p><p className="text-2xl font-bold text-orange-600">{formatCurrency(totals.outstanding)}</p></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Project Revenue vs Expenses">
          {projectData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
                <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-12">No project data yet.</p>
          )}
        </Card>

        <Card title="Expenses by Category">
          {expensesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {expensesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500 py-12">No expense data yet.</p>
          )}
        </Card>
      </div>

      {/* Quick Reports */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Project Profitability">
          {projectData.length > 0 ? (
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500"><th className="pb-2">Project</th><th className="pb-2 text-right">Revenue</th><th className="pb-2 text-right">Expenses</th><th className="pb-2 text-right">Profit</th></tr></thead>
              <tbody>
                {projectData.map((p) => (
                  <tr key={p.name} className="border-b last:border-0">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-right">{formatCurrency(p.revenue)}</td>
                    <td className="py-2 text-right">{formatCurrency(p.expenses)}</td>
                    <td className={`py-2 text-right font-semibold ${p.revenue - p.expenses >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(p.revenue - p.expenses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 py-8">No data available.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
