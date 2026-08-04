"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Client, Project, Invoice } from "@/lib/types";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: c } = await supabase.from("clients").select("*").eq("id", id).single();
    setClient(c);

    const [projRes, invRes] = await Promise.all([
      supabase.from("projects").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("client_id", id).order("created_at", { ascending: false }),
    ]);

    setProjects((projRes.data || []) as Project[]);
    setInvoices((invRes.data || []) as Invoice[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <Loading size="lg" />;
  if (!client) return <div className="text-center py-12">Client not found.</div>;

  const totalBilled = invoices.reduce((s, i) => s + i.grand_total, 0);
  const totalOutstanding = invoices.filter((i) => i.status !== "paid").reduce((s, i) => s + (i.grand_total - (i.amount_paid || 0)), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={client.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Client Details">
          <div className="text-sm space-y-2">
            {client.contact_person && <div><span className="text-gray-500">Contact:</span> <span className="font-medium">{client.contact_person}</span></div>}
            {client.email && <div><span className="text-gray-500">Email:</span> <span className="font-medium">{client.email}</span></div>}
            {client.phone && <div><span className="text-gray-500">Phone:</span> <span className="font-medium">{client.phone}</span></div>}
            {client.address && <div><span className="text-gray-500">Address:</span> <span className="font-medium">{client.address}</span></div>}
            {client.gst_number && <div><span className="text-gray-500">GST:</span> <span className="font-medium">{client.gst_number}</span></div>}
          </div>
        </Card>

        <Card title="Financial Summary">
          <div className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-gray-500">Total Projects</span><span className="font-medium">{projects.length}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Total Invoiced</span><span className="font-medium">{formatCurrency(totalBilled)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Outstanding</span><span className="font-bold text-red-600">{formatCurrency(totalOutstanding)}</span></div>
          </div>
        </Card>
      </div>

      {projects.length > 0 && (
        <Card title={`Projects (${projects.length})`}>
          <div className="space-y-2">
            {projects.map((p) => (
              <a key={p.id} href={`/projects/${p.id}`} className="block rounded-lg border p-3 hover:bg-gray-50">
                <div className="flex justify-between">
                  <span className="font-medium">{p.name}</span>
                  <StatusBadge status={p.status} />
                </div>
                {p.location && <p className="text-xs text-gray-500 mt-1">{p.location}</p>}
              </a>
            ))}
          </div>
        </Card>
      )}

      {invoices.length > 0 && (
        <Card title={`Invoices (${invoices.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500"><th className="pb-2">Invoice #</th><th className="pb-2">Status</th><th className="pb-2 text-right">Amount</th><th className="pb-2">Date</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{inv.invoice_number}</td>
                    <td className="py-2"><StatusBadge status={inv.status} /></td>
                    <td className="py-2 text-right">{formatCurrency(inv.grand_total)}</td>
                    <td className="py-2 text-gray-500">{formatDate(inv.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
