import { z } from "zod";

// Company
export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  gst_number: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  terms_template: z.string().optional(),
});

// Client
export const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  contact_person: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

// Project
export const projectSchema = z.object({
  client_id: z.string().uuid(),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  area_sqft: z.number().positive().optional(),
  status: z
    .enum(["planning", "in_progress", "on_hold", "completed", "cancelled"])
    .default("planning"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().positive().optional(),
});

// BOQ
export const boqSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1, "BOQ title is required"),
  notes: z.string().optional(),
});

export const boqLineItemSchema = z.object({
  boq_id: z.string().uuid(),
  category: z.string().min(1),
  description: z.string().min(1),
  unit: z.string().default("sqft"),
  quantity: z.number().positive(),
  rate: z.number().min(0),
  labour_rate: z.number().min(0).optional(),
  labour_amount: z.number().min(0).optional(),
  remarks: z.string().optional(),
});

// Vendor
export const vendorSchema = z.object({
  name: z.string().min(1, "Vendor name is required"),
  contact_person: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  gst_number: z.string().optional(),
  category: z.string().optional(),
  rating: z.number().min(1).max(5).default(3),
  status: z.enum(["active", "inactive"]).default("active"),
});

// Purchase Order
export const purchaseOrderSchema = z.object({
  project_id: z.string().uuid(),
  vendor_id: z.string().uuid(),
  po_number: z.string().min(1),
  subtotal: z.number().default(0),
  gst_amount: z.number().default(0),
  grand_total: z.number().default(0),
  notes: z.string().optional(),
  expected_delivery: z.string().optional(),
});

export const poLineItemSchema = z.object({
  po_id: z.string().uuid(),
  material_id: z.string().uuid().optional(),
  description: z.string().min(1),
  unit: z.string(),
  quantity: z.number().positive(),
  rate: z.number().min(0),
});

// Material
export const materialSchema = z.object({
  name: z.string().min(1, "Material name is required"),
  category: z.string().min(1),
  unit: z.string().default("sqft"),
  description: z.string().optional(),
});

// Inventory
export const inventorySchema = z.object({
  project_id: z.string().uuid().optional(),
  material_id: z.string().uuid(),
  quantity_received: z.number().default(0),
  quantity_consumed: z.number().default(0),
  unit: z.string(),
});

// Labour
export const labourSchema = z.object({
  project_id: z.string().uuid(),
  name: z.string().min(1),
  trade: z.string().min(1),
  daily_rate: z.number().min(0).default(0),
  contact: z.string().optional(),
});

// Attendance
export const attendanceSchema = z.object({
  project_id: z.string().uuid(),
  labour_id: z.string().uuid(),
  date: z.string(),
  present: z.boolean().default(true),
  overtime_hours: z.number().default(0),
  notes: z.string().optional(),
});

// Site Report
export const siteReportSchema = z.object({
  project_id: z.string().uuid(),
  report_date: z.string(),
  labour_count: z.number().default(0),
  work_summary: z.string().min(1),
  issues: z.string().optional(),
  delays: z.string().optional(),
  weather: z.string().optional(),
});

// Invoice
export const invoiceSchema = z.object({
  project_id: z.string().uuid(),
  client_id: z.string().uuid(),
  invoice_number: z.string().min(1),
  subtotal: z.number().default(0),
  gst_amount: z.number().default(0),
  grand_total: z.number().default(0),
  due_date: z.string().optional(),
  notes: z.string().optional(),
});

// Payment
export const paymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
  payment_date: z.string(),
  payment_mode: z.enum(["cash", "bank_transfer", "cheque", "upi", "other"]).default("bank_transfer"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

// Expense
export const expenseSchema = z.object({
  project_id: z.string().uuid(),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  expense_date: z.string(),
  vendor_id: z.string().uuid().optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type BOQInput = z.infer<typeof boqSchema>;
export type BOQLineItemInput = z.infer<typeof boqLineItemSchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type POLineItemInput = z.infer<typeof poLineItemSchema>;
export type MaterialInput = z.infer<typeof materialSchema>;
export type InventoryInput = z.infer<typeof inventorySchema>;
export type LabourInput = z.infer<typeof labourSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type SiteReportInput = z.infer<typeof siteReportSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
