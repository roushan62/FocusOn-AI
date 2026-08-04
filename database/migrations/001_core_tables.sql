-- Migration 001: Core Tables
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  logo_url TEXT,
  gst_number TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  terms_template TEXT DEFAULT 'Thank you for choosing us. Payment due within 15 days. All prices exclusive of applicable taxes.',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company" ON companies
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their company" ON companies
  FOR UPDATE USING (auth.uid() = id);

-- Clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage clients" ON clients
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  area_sqft NUMERIC,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can manage projects" ON projects
  FOR ALL USING (company_id IN (SELECT id FROM companies WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_client ON projects(client_id);
