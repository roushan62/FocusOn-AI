import { type SupabaseClient } from "@supabase/supabase-js";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company;
        Insert: Omit<Company, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Company, "id">>;
      };
      clients: {
        Row: Client;
        Insert: Omit<Client, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Client, "id">>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Project, "id">>;
      };
      boqs: {
        Row: BOQ;
        Insert: Omit<BOQ, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BOQ, "id">>;
      };
      boq_line_items: {
        Row: BOQLineItem;
        Insert: Omit<BOQLineItem, "id" | "created_at">;
        Update: Partial<Omit<BOQLineItem, "id">>;
      };
      quotations: {
        Row: Quotation;
        Insert: Omit<Quotation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Quotation, "id">>;
      };
      vendors: {
        Row: Vendor;
        Insert: Omit<Vendor, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Vendor, "id">>;
      };
      purchase_orders: {
        Row: PurchaseOrder;
        Insert: Omit<PurchaseOrder, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<PurchaseOrder, "id">>;
      };
      po_line_items: {
        Row: POLineItem;
        Insert: Omit<POLineItem, "id" | "created_at">;
        Update: Partial<Omit<POLineItem, "id">>;
      };
      materials: {
        Row: Material;
        Insert: Omit<Material, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Material, "id">>;
      };
      inventory: {
        Row: InventoryItem;
        Insert: Omit<InventoryItem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<InventoryItem, "id">>;
      };
      labour: {
        Row: Labour;
        Insert: Omit<Labour, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Labour, "id">>;
      };
      attendance: {
        Row: Attendance;
        Insert: Omit<Attendance, "id" | "created_at">;
        Update: Partial<Omit<Attendance, "id">>;
      };
      site_reports: {
        Row: SiteReport;
        Insert: Omit<SiteReport, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<SiteReport, "id">>;
      };
      invoices: {
        Row: Invoice;
        Insert: Omit<Invoice, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Invoice, "id">>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, "id" | "created_at">;
        Update: Partial<Omit<Payment, "id">>;
      };
      documents: {
        Row: Document;
        Insert: Omit<Document, "id" | "created_at">;
        Update: Partial<Omit<Document, "id">>;
      };
      ai_conversations: {
        Row: AIConversation;
        Insert: Omit<AIConversation, "id" | "created_at">;
        Update: Partial<Omit<AIConversation, "id">>;
      };
      material_price_history: {
        Row: MaterialPriceHistory;
        Insert: Omit<MaterialPriceHistory, "id" | "created_at">;
        Update: Partial<Omit<MaterialPriceHistory, "id">>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Expense, "id">>;
      };
    };
  };
}

// --- Core Types ---

export interface Company {
  id: string;
  name: string;
  logo_url: string | null;
  gst_number: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  terms_template: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  notes: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  client_id: string;
  name: string;
  description: string | null;
  location: string | null;
  area_sqft: number | null;
  status: "planning" | "in_progress" | "on_hold" | "completed" | "cancelled";
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
}

export interface BOQ {
  id: string;
  company_id: string;
  project_id: string;
  title: string;
  version: number;
  status: "draft" | "final" | "approved";
  created_by: string;
  approved_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BOQLineItem {
  id: string;
  boq_id: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  labour_rate: number | null;
  labour_amount: number | null;
  remarks: string | null;
  created_at: string;
}

export interface Quotation {
  id: string;
  company_id: string;
  project_id: string;
  boq_id: string | null;
  quotation_number: string;
  revision: number;
  status: "draft" | "sent" | "approved" | "rejected";
  discount_percent: number;
  discount_amount: number;
  gst_percent: number;
  gst_amount: number;
  profit_margin_percent: number;
  subtotal: number;
  grand_total: number;
  terms: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: string;
  company_id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  gst_number: string | null;
  category: string | null;
  rating: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrder {
  id: string;
  company_id: string;
  project_id: string;
  vendor_id: string;
  po_number: string;
  status: "draft" | "sent_for_approval" | "approved" | "issued" | "cancelled";
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  notes: string | null;
  approved_by: string | null;
  issued_date: string | null;
  expected_delivery: string | null;
  created_at: string;
  updated_at: string;
}

export interface POLineItem {
  id: string;
  po_id: string;
  material_id: string | null;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  created_at: string;
}

export interface Material {
  id: string;
  company_id: string;
  name: string;
  category: string;
  unit: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  company_id: string;
  project_id: string | null;
  material_id: string;
  quantity_received: number;
  quantity_consumed: number;
  quantity_available: number;
  unit: string;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface Labour {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  trade: string;
  daily_rate: number;
  contact: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  company_id: string;
  project_id: string;
  labour_id: string;
  date: string;
  present: boolean;
  overtime_hours: number;
  notes: string | null;
  created_at: string;
}

export interface SiteReport {
  id: string;
  company_id: string;
  project_id: string;
  report_date: string;
  labour_count: number;
  work_summary: string;
  issues: string | null;
  delays: string | null;
  photos: string[] | null;
  weather: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  project_id: string;
  client_id: string;
  invoice_number: string;
  status: "draft" | "sent" | "paid" | "partially_paid" | "overdue" | "cancelled";
  subtotal: number;
  gst_amount: number;
  grand_total: number;
  amount_paid: number;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  company_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_mode: "cash" | "bank_transfer" | "cheque" | "upi" | "other";
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  company_id: string;
  project_id: string | null;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  category: string | null;
  extracted_text: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  company_id: string;
  user_id: string;
  project_id: string | null;
  agent: string;
  user_message: string;
  ai_response: string;
  structured_output: Json | null;
  created_at: string;
}

export interface MaterialPriceHistory {
  id: string;
  company_id: string;
  material_id: string;
  vendor_id: string;
  po_id: string;
  rate: number;
  unit: string;
  created_at: string;
}

export interface Expense {
  id: string;
  company_id: string;
  project_id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  vendor_id: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}
