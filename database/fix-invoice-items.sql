-- Add missing columns to invoice_items table
-- Run this SQL in Supabase SQL Editor

ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_covered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insurance_coverage_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS insurance_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS patient_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS provider_id UUID,
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Check table structure
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'invoice_items' 
AND table_schema = 'public'
ORDER BY ordinal_position;
