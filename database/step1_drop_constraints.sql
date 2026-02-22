-- ============================================================
-- STEP 1: Drop ALL foreign key constraints on invoice_items
-- Run this FIRST in Supabase SQL Editor
-- ============================================================

-- Find and drop ALL foreign key constraints on invoice_items
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'invoice_items' 
        AND table_schema = 'public'
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE format('ALTER TABLE public.invoice_items DROP CONSTRAINT %I', constraint_rec.constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_rec.constraint_name;
    END LOOP;
END $$;

-- Verify all constraints are dropped
SELECT 'Remaining constraints on invoice_items:' AS info;
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'invoice_items' AND table_schema = 'public';
