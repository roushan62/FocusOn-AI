"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Loading } from "@/components/ui/Loading";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatCurrency } from "@/lib/utils";
import type { Quotation, Company, Client, Project, BOQLineItem } from "@/lib/types";

export default function QuotationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<BOQLineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: q } = await supabase.from("quotations").select("*").eq("id", id).single();
    if (!q) { setLoading(false); return; }
    setQuotation(q);

    const { data: c } = await supabase.from("companies").select("*").eq("id", q.company_id).single();
    setCompany(c);

    if (q.project_id) {
      const { data: p } = await supabase.from("projects").select("*").eq("id", q.project_id).single();
      if (p) {
        setProject(p);
        const { data: cl } = await supabase.from("clients").select("*").eq("id", p.client_id).single();
        setClient(cl);
      }
    }

    if (q.boq_id) {
      const { data: itemsData } = await supabase.from("boq_line_items").select("*").eq("boq_id", q.boq_id);
      setItems(itemsData || []);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExportPDF = async () => {
    // Client-side PDF generation using browser print
    window.print();
  };

  const handleStatusChange = async (newStatus: string) => {
    await supabase.from("quotations").update({ status: newStatus }).eq("id", id);
    fetchData();
  };

  if (loading) return <Loading size="lg" />;
  if (!quotation) return <div className="text-center py-12">Quotation not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quotation {quotation.quotation_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <StatusBadge status={quotation.status} />
            <span className="text-sm text-gray-500">Rev {quotation.revision}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {quotation.status === "draft" && (
            <>
              <Button variant="secondary" onClick={() => handleStatusChange("sent")}>Mark as Sent</Button>
              <Button variant="danger" onClick={() => handleStatusChange("rejected")}>Reject</Button>
            </>
          )}
          {quotation.status === "sent" && (
            <>
              <Button onClick={() => handleStatusChange("approved")}>Approve</Button>
              <Button variant="danger" onClick={() => handleStatusChange("rejected")}>Reject</Button>
            </>
          )}
          <Button variant="outline" onClick={handleExportPDF}>Print / PDF</Button>
        </div>
      </div>

      {/* Company & Client Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {company && (
          <Card title="From">
            <div className="text-sm space-y-1">
              <p className="font-semibold">{company.name}</p>
              {company.address && <p>{company.address}</p>}
              {company.gst_number && <p className="text-gray-500">GST: {company.gst_number}</p>}
              {company.phone && <p>{company.phone}</p>}
            </div>
          </Card>
        )}
        <Card title="To">
          <div className="text-sm space-y-1">
            {client ? (
              <>
                <p className="font-semibold">{client.name}</p>
                {client.address && <p>{client.address}</p>}
                {client.gst_number && <p className="text-gray-500">GST: {client.gst_number}</p>}
              </>
            ) : (
              <p className="text-gray-500">Client details unavailable</p>
            )}
          </div>
        </Card>
      </div>

      {/* Project Info */}
      {project && (
        <Card>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">Project:</span> <span className="font-medium">{project.name}</span></div>
            {project.location && <div><span className="text-gray-500">Location:</span> <span className="font-medium">{project.location}</span></div>}
            {project.area_sqft && <div><span className="text-gray-500">Area:</span> <span className="font-medium">{project.area_sqft} sq ft</span></div>}
          </div>
        </Card>
      )}

      {/* Items */}
      {items.length > 0 && (
        <Card title="Bill of Quantities">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">#</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Qty</th>
                  <th className="pb-2">Unit</th>
                  <th className="pb-2 text-right">Rate</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2">{item.category}</td>
                    <td className="py-2">{item.description}</td>
                    <td className="py-2 text-right">{item.quantity}</td>
                    <td className="py-2">{item.unit}</td>
                    <td className="py-2 text-right">{formatCurrency(item.rate)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Financial Summary */}
      <Card title="Financial Summary">
        <div className="space-y-2 text-sm max-w-xs ml-auto">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">{formatCurrency(quotation.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Profit Margin ({quotation.profit_margin_percent}%)</span>
            <span className="font-medium text-green-600">{formatCurrency((quotation.subtotal * quotation.profit_margin_percent) / 100)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Discount ({quotation.discount_percent}%)</span>
            <span className="font-medium text-red-600">-{formatCurrency(quotation.discount_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">GST ({quotation.gst_percent}%)</span>
            <span className="font-medium">{formatCurrency(quotation.gst_amount)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-base">
            <span className="font-semibold">Grand Total</span>
            <span className="font-bold text-blue-600">{formatCurrency(quotation.grand_total)}</span>
          </div>
        </div>
      </Card>

      {/* Terms */}
      {quotation.terms && (
        <Card title="Terms & Conditions">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{quotation.terms}</p>
        </Card>
      )}

      {quotation.valid_until && (
        <p className="text-sm text-gray-500">Valid until: {formatDate(quotation.valid_until)}</p>
      )}
    </div>
  );
}
