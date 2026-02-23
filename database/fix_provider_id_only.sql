-- ============================================================
-- Fix provider_id column type from UUID to VARCHAR
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, check if there's any data in provider_id column
SELECT '=== Check current provider_id data ===' AS info;
SELECT COUNT(*) as total_rows, 
       COUNT(CASE WHEN provider_id IS NOT NULL THEN 1 END) as rows_with_provider_id,
       COUNT(CASE WHEN provider_id IS NOT NULL AND provider_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as uuid_format_count
FROM public.invoice_items;

-- Show sample provider_id values
SELECT '=== Sample provider_id values ===' AS info;
SELECT DISTINCT provider_id, COUNT(*) as count
FROM public.invoice_items 
WHERE provider_id IS NOT NULL
GROUP BY provider_id
LIMIT 10;

-- Drop any foreign key constraints that reference provider_id
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'invoice_items' 
        AND tc.table_schema = 'public'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'provider_id'
    LOOP
        EXECUTE format('ALTER TABLE public.invoice_items DROP CONSTRAINT IF EXISTS %I CASCADE', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Change provider_id from UUID to VARCHAR(50)
-- First, create a temporary column to preserve data
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS provider_id_temp VARCHAR(50);

-- Copy data from provider_id to provider_id_temp, converting UUIDs to strings if needed
UPDATE public.invoice_items 
SET provider_id_temp = CASE 
    WHEN provider_id IS NULL THEN NULL
    ELSE provider_id::text
END;

-- Drop the original UUID column
ALTER TABLE public.invoice_items DROP COLUMN IF EXISTS provider_id;

-- Rename the temporary column to provider_id
ALTER TABLE public.invoice_items RENAME COLUMN provider_id_temp TO provider_id;

-- Verify the change
SELECT '=== Verification ===' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoice_items' 
AND column_name = 'provider_id'
AND table_schema = 'public';

-- Show the updated data
SELECT '=== Updated provider_id data ===' AS info;
SELECT DISTINCT provider_id, COUNT(*) as count
FROM public.invoice_items 
WHERE provider_id IS NOT NULL
GROUP BY provider_id
LIMIT 10;
