-- Migration 002: BOQ & Quotation Tables
-- Run this in Supabase SQL Editor

-- BOQs
CREATE TABLE boqs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'final', 'approved')),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE boqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage boqs" ON boqs
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- BOQ Line Items
CREATE TABLE boq_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  boq_id UUID NOT NULL REFERENCES boqs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'sqft',
  quantity NUMERIC NOT NULL DEFAULT 1,
  rate NUMERIC NOT NULL DEFAULT 0,
  amount NUMERIC GENERATED ALWAYS AS (quantity * rate) STORED,
  labour_rate NUMERIC,
  labour_amount NUMERIC,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE boq_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage boq items" ON boq_line_items
  FOR ALL USING (boq_id IN (SELECT id FROM boqs WHERE company_id IN (SELECT id FROM companies WHERE id = auth.uid())));

-- Quotations
CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  boq_id UUID REFERENCES boqs(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL,
  revision INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  gst_percent NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,
  profit_margin_percent NUMERIC DEFAULT 15,
  subtotal NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  terms TEXT,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage quotations" ON quotations
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

CREATE INDEX idx_boqs_project ON boqs(project_id);
CREATE INDEX idx_quotations_project ON quotations(project_id);
