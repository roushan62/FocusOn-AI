-- Migration 005: No-Signup Open Concept Workspace
-- Run this in Supabase SQL Editor if connecting a real PostgreSQL database
-- This enables open workspace access without requiring user login or signup.

-- Insert default company if not exists
INSERT INTO companies (id, name, gst_number, address, phone, email, website, terms_template)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Apex Interior Fit-Outs Pvt Ltd',
  '29AAXCA8976F1Z9',
  'Level 4, Prestige Tech Park, Outer Ring Road, Bangalore - 560103',
  '+91 80 4567 8900',
  'projects@apexfitouts.in',
  'https://apexfitouts.in',
  '1. 50% Advance along with work order. 2. 40% against material delivery at site. 3. 10% on completion and handover. 4. All rates exclusive of applicable GST (18%).'
)
ON CONFLICT (id) DO NOTHING;

-- Open RLS Policies for No-Signup Concept
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Users can update their company" ON companies;
DROP POLICY IF EXISTS "Enable insert for all users" ON companies;
CREATE POLICY "Open workspace read companies" ON companies FOR SELECT USING (true);
CREATE POLICY "Open workspace write companies" ON companies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage clients" ON clients;
CREATE POLICY "Open workspace manage clients" ON clients FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage projects" ON projects;
CREATE POLICY "Open workspace manage projects" ON projects FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE boqs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage boqs" ON boqs;
CREATE POLICY "Open workspace manage boqs" ON boqs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE boq_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage boq_line_items" ON boq_line_items;
CREATE POLICY "Open workspace manage boq_line_items" ON boq_line_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage quotations" ON quotations;
CREATE POLICY "Open workspace manage quotations" ON quotations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage purchase_orders" ON purchase_orders;
CREATE POLICY "Open workspace manage purchase_orders" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage po_line_items" ON po_line_items;
CREATE POLICY "Open workspace manage po_line_items" ON po_line_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage vendors" ON vendors;
CREATE POLICY "Open workspace manage vendors" ON vendors FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage materials" ON materials;
CREATE POLICY "Open workspace manage materials" ON materials FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage inventory" ON inventory;
CREATE POLICY "Open workspace manage inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE site_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage site_reports" ON site_reports;
CREATE POLICY "Open workspace manage site_reports" ON site_reports FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage invoices" ON invoices;
CREATE POLICY "Open workspace manage invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage expenses" ON expenses;
CREATE POLICY "Open workspace manage expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage payments" ON payments;
CREATE POLICY "Open workspace manage payments" ON payments FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage documents" ON documents;
CREATE POLICY "Open workspace manage documents" ON documents FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members can manage ai_conversations" ON ai_conversations;
CREATE POLICY "Open workspace manage ai_conversations" ON ai_conversations FOR ALL USING (true) WITH CHECK (true);
