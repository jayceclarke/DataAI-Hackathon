-- Add source_document_id to concepts so we can group concepts by upload.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor).

ALTER TABLE concepts
ADD COLUMN IF NOT EXISTS source_document_id uuid REFERENCES source_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_concepts_source_document_id ON concepts(source_document_id);
