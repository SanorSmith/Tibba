-- Add is_prescribed column to items table
-- Distinguishes between prescribed (Rx) and unprescribed (OTC) medications
ALTER TABLE items ADD COLUMN IF NOT EXISTS is_prescribed BOOLEAN DEFAULT false;
