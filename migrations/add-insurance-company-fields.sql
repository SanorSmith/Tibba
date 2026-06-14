-- Add missing fields to insurance_companies table
ALTER TABLE insurance_companies 
ADD COLUMN IF NOT EXISTS api_endpoint text,
ADD COLUMN IF NOT EXISTS api_key text,
ADD COLUMN IF NOT EXISTS edi_payer_id text,
ADD COLUMN IF NOT EXISTS claim_submission_method text,
ADD COLUMN IF NOT EXISTS pre_approval_required boolean NOT NULL DEFAULT true;
