-- Migration 003: Purchase, Inventory, Materials
-- Run this in Supabase SQL Editor

-- Vendors
CREATE TABLE vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  category TEXT,
  rating INTEGER DEFAULT 3 CHECK (rating >= 1 AND rating <= 5),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage vendors" ON vendors
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Materials
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'sqft',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage materials" ON materials
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Material Price History
CREATE TABLE material_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  po_id UUID NOT NULL,
  rate NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE material_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view price history" ON material_price_history
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Purchase Orders
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent_for_approval', 'approved', 'issued', 'cancelled')),
  subtotal NUMERIC DEFAULT 0,
  gst_amount NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  issued_date DATE,
  expected_delivery DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage POs" ON purchase_orders
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- PO Line Items
CREATE TABLE po_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  amount NUMERIC GENERATED ALWAYS AS (quantity * rate) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE po_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage PO items" ON po_line_items
  FOR ALL USING (po_id IN (SELECT id FROM purchase_orders WHERE company_id IN (SELECT id FROM companies WHERE id = auth.uid())));

-- Inventory
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  material_id UUID NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
  quantity_received NUMERIC DEFAULT 0,
  quantity_consumed NUMERIC DEFAULT 0,
  quantity_available NUMERIC GENERATED ALWAYS AS (quantity_received - quantity_consumed) STORED,
  unit TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage inventory" ON inventory
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));
