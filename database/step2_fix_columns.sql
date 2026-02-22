-- ============================================================
-- STEP 2: Fix column types and add missing columns
-- Run this AFTER step1_drop_constraints.sql succeeds
-- ============================================================

-- Change service_catalog.id from UUID to VARCHAR
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'service_catalog' 
    AND column_name = 'id' 
    AND data_type = 'uuid'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.service_catalog ALTER COLUMN id TYPE VARCHAR(50) USING id::VARCHAR;
    RAISE NOTICE 'Changed service_catalog.id from UUID to VARCHAR(50)';
  END IF;
END $$;

-- Change invoice_items.service_id from UUID to VARCHAR (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'invoice_items' 
    AND column_name = 'service_id' 
    AND data_type = 'uuid'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.invoice_items ALTER COLUMN service_id TYPE VARCHAR(50) USING service_id::VARCHAR;
    RAISE NOTICE 'Changed invoice_items.service_id from UUID to VARCHAR(50)';
  END IF;
END $$;

-- Add missing columns to invoice_items for payment tracking
ALTER TABLE public.invoice_items 
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS payment_batch_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Add missing columns to service_catalog
ALTER TABLE public.service_catalog
ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS service_fee DECIMAL(10,2) DEFAULT 0;

-- Verify column types
SELECT '=== service_catalog columns ===' AS info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'service_catalog' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== invoice_items columns ===' AS info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'invoice_items' AND table_schema = 'public'
ORDER BY ordinal_position;
