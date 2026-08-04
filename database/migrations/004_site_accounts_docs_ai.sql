-- Migration 004: Site, Accounts, Documents, AI
-- Run this in Supabase SQL Editor

-- Labour
CREATE TABLE labour (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trade TEXT NOT NULL,
  daily_rate NUMERIC DEFAULT 0,
  contact TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE labour ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage labour" ON labour
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Attendance
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  labour_id UUID NOT NULL REFERENCES labour(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  present BOOLEAN DEFAULT TRUE,
  overtime_hours NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage attendance" ON attendance
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Site Reports (DPR)
CREATE TABLE site_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  labour_count INTEGER DEFAULT 0,
  work_summary TEXT NOT NULL DEFAULT '',
  issues TEXT,
  delays TEXT,
  photos TEXT[],
  weather TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE site_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage site reports" ON site_reports
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled')),
  subtotal NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage invoices" ON invoices
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Payments
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT DEFAULT 'bank_transfer' CHECK (payment_mode IN ('cash', 'bank_transfer', 'cheque', 'upi', 'other')),
  reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage payments" ON payments
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Expenses
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage expenses" ON expenses
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  category TEXT,
  extracted_text TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage documents" ON documents
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- AI Conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  agent TEXT NOT NULL DEFAULT 'general',
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  structured_output JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their conversations" ON ai_conversations
  FOR ALL USING (user_id = auth.uid());
