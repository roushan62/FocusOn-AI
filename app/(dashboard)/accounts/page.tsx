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
import { formatDate, formatCurrency, generateNumber } from "@/lib/utils";
import type { Invoice, Payment, Project, Client, Expense } from "@/lib/types";

export default function AccountsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ project_id: "", client_id: "", subtotal: "0", notes: "", due_date: "" });
  const [expenseForm, setExpenseForm] = useState({ project_id: "", category: "", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
  const [paymentForm, setPaymentForm] = useState({ amount: "", payment_mode: "bank_transfer", payment_date: new Date().toISOString().split("T")[0], reference: "", notes: "" });

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [invRes, expRes, pRes, cRes] = await Promise.all([
      supabase.from("invoices").select("*").eq("company_id", user.id).order("created_at", { ascending: false }),
      supabase.from("expenses").select("*").eq("company_id", user.id).order("expense_date", { ascending: false }),
      supabase.from("projects").select("id,name").eq("company_id", user.id),
      supabase.from("clients").select("id,name").eq("company_id", user.id),
    ]);

    setInvoices(invRes.data || []);
    setExpenses(expRes.data || []);
    if (pRes.data) setProjects(pRes.data as Project[]);
    if (cRes.data) setClients(cRes.data as Client[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const subtotal = parseFloat(invoiceForm.subtotal);
    const gst = subtotal * 0.18;
    const { count } = await supabase.from("invoices").select("*", { count: "exact", head: true }).eq("company_id", user.id);

    await supabase.from("invoices").insert({
      company_id: user.id,
      project_id: invoiceForm.project_id,
      client_id: invoiceForm.client_id,
      invoice_number: generateNumber("INV", count || 0),
      subtotal,
      gst_amount: gst,
      grand_total: subtotal + gst,
      notes: invoiceForm.notes || null,
      due_date: invoiceForm.due_date || null,
    });

    setSaving(false);
    setShowInvoiceForm(false);
    setInvoiceForm({ project_id: "", client_id: "", subtotal: "0", notes: "", due_date: "" });
    fetchData();
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const amount = parseFloat(paymentForm.amount);
    await supabase.from("payments").insert({
      company_id: user.id,
      invoice_id: selectedInvoice.id,
      amount,
      payment_date: paymentForm.payment_date,
      payment_mode: paymentForm.payment_mode,
      reference: paymentForm.reference || null,
      notes: paymentForm.notes || null,
    });

    const newPaid = (selectedInvoice.amount_paid || 0) + amount;
    const newStatus = newPaid >= selectedInvoice.grand_total ? "paid" : "partially_paid";
    await supabase.from("invoices").update({ amount_paid: newPaid, status: newStatus }).eq("id", selectedInvoice.id);

    setSaving(false);
    setShowPaymentForm(false);
    setSelectedInvoice(null);
    fetchData();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("expenses").insert({
      company_id: user.id,
      project_id: expenseForm.project_id,
      category: expenseForm.category,
      description: expenseForm.description,
      amount: parseFloat(expenseForm.amount),
      expense_date: expenseForm.expense_date,
    });

    setSaving(false);
    setShowExpenseForm(false);
    setExpenseForm({ project_id: "", category: "", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
    fetchData();
  };

  const totalOutstanding = invoices.reduce((s, i) => s + (i.grand_total - (i.amount_paid || 0)), 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) return <Loading size="lg" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-sm text-gray-500">Invoices, Payments & Expenses</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowExpenseForm(true)} variant="secondary">+ Expense</Button>
          <Button onClick={() => setShowInvoiceForm(true)}>+ Invoice</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><p className="text-sm text-gray-500">Total Outstanding</p><p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutstanding)}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Expenses</p><p className="text-2xl font-bold text-orange-600">{formatCurrency(totalExpenses)}</p></Card>
        <Card><p className="text-sm text-gray-500">Total Invoices</p><p className="text-2xl font-bold">{invoices.length}</p></Card>
      </div>

      <Card title="Invoices">
        {invoices.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No invoices yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">Invoice #</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Paid</th>
                  <th className="pb-2 text-right">Balance</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const balance = inv.grand_total - (inv.amount_paid || 0);
                  return (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-2 font-medium">{inv.invoice_number}</td>
                      <td className="py-2"><StatusBadge status={inv.status} /></td>
                      <td className="py-2 text-right">{formatCurrency(inv.grand_total)}</td>
                      <td className="py-2 text-right">{formatCurrency(inv.amount_paid || 0)}</td>
                      <td className="py-2 text-right font-semibold text-red-600">{formatCurrency(balance)}</td>
                      <td className="py-2 text-gray-500">{formatDate(inv.created_at)}</td>
                      <td className="py-2">
                        {inv.status !== "paid" && (
                          <button
                            onClick={() => { setSelectedInvoice(inv); setShowPaymentForm(true); }}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Add Payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Recent Expenses">
        {expenses.length === 0 ? (
          <p className="text-center text-gray-500 py-4">No expenses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 10).map((exp) => (
                  <tr key={exp.id} className="border-b last:border-0">
                    <td className="py-2">{formatDate(exp.expense_date)}</td>
                    <td className="py-2">{exp.category}</td>
                    <td className="py-2">{exp.description}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(exp.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Invoice Form Modal */}
      <Modal open={showInvoiceForm} onClose={() => setShowInvoiceForm(false)} title="New Invoice">
        <form onSubmit={handleCreateInvoice} className="space-y-4">
          <Select label="Project" value={invoiceForm.project_id} onChange={(e) => setInvoiceForm({ ...invoiceForm, project_id: e.target.value })} options={projects.map((p) => ({ value: p.id, label: p.name }))} required />
          <Select label="Client" value={invoiceForm.client_id} onChange={(e) => setInvoiceForm({ ...invoiceForm, client_id: e.target.value })} options={clients.map((c) => ({ value: c.id, label: c.name }))} required />
          <Input label="Subtotal (₹)" type="number" value={invoiceForm.subtotal} onChange={(e) => setInvoiceForm({ ...invoiceForm, subtotal: e.target.value })} required />
          <Input label="Due Date" type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm({ ...invoiceForm, due_date: e.target.value })} />
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} /></div>
          <div className="flex gap-2"><Button type="submit" loading={saving}>Create</Button><Button type="button" variant="ghost" onClick={() => setShowInvoiceForm(false)}>Cancel</Button></div>
        </form>
      </Modal>

      {/* Payment Form Modal */}
      <Modal open={showPaymentForm} onClose={() => { setShowPaymentForm(false); setSelectedInvoice(null); }} title="Add Payment">
        <form onSubmit={handleAddPayment} className="space-y-4">
          {selectedInvoice && <p className="text-sm text-gray-500">Invoice: {selectedInvoice.invoice_number} — Balance: {formatCurrency(selectedInvoice.grand_total - (selectedInvoice.amount_paid || 0))}</p>}
          <Input label="Amount (₹)" type="number" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required />
          <Select label="Mode" value={paymentForm.payment_mode} onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value })} options={[
            { value: "bank_transfer", label: "Bank Transfer" }, { value: "cash", label: "Cash" }, { value: "cheque", label: "Cheque" }, { value: "upi", label: "UPI" }, { value: "other", label: "Other" }
          ]} />
          <Input label="Date" type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
          <Input label="Reference" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
          <div className="flex gap-2"><Button type="submit" loading={saving}>Add Payment</Button><Button type="button" variant="ghost" onClick={() => { setShowPaymentForm(false); setSelectedInvoice(null); }}>Cancel</Button></div>
        </form>
      </Modal>

      {/* Expense Form Modal */}
      <Modal open={showExpenseForm} onClose={() => setShowExpenseForm(false)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <Select label="Project" value={expenseForm.project_id} onChange={(e) => setExpenseForm({ ...expenseForm, project_id: e.target.value })} options={projects.map((p) => ({ value: p.id, label: p.name }))} required />
          <Select label="Category" value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} options={[
            { value: "Labour", label: "Labour" }, { value: "Material", label: "Material" }, { value: "Transport", label: "Transport" }, { value: "Equipment", label: "Equipment" }, { value: "Utility", label: "Utility" }, { value: "Other", label: "Other" }
          ]} required />
          <Input label="Description" value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} required />
          <Input label="Amount (₹)" type="number" step="0.01" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} required />
          <Input label="Date" type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })} />
          <div className="flex gap-2"><Button type="submit" loading={saving}>Add Expense</Button><Button type="button" variant="ghost" onClick={() => setShowExpenseForm(false)}>Cancel</Button></div>
        </form>
      </Modal>
    </div>
  );
}
