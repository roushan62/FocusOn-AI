-- Migration 006: Documents storage bucket for the open workspace
-- Run after 005_no_signup_open_concept.sql in Supabase SQL Editor.
-- This keeps the document module functional on a fresh Vercel + Supabase setup.

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Open workspace read documents" ON storage.objects;
CREATE POLICY "Open workspace read documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "Open workspace upload documents" ON storage.objects;
CREATE POLICY "Open workspace upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Open workspace update documents" ON storage.objects;
CREATE POLICY "Open workspace update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Open workspace delete documents" ON storage.objects;
CREATE POLICY "Open workspace delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents');
