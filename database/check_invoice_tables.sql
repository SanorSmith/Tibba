-- ============================================================
-- Check What Invoice Tables Actually Exist
-- Run this in Supabase SQL Editor
-- ============================================================

-- Show all tables that contain 'invoice' in the name
SELECT '=== tables with invoice in name ===' AS info;
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_name LIKE '%invoice%' 
AND table_schema = 'public'
ORDER BY table_name;

-- Check the main invoices table structure
SELECT '=== invoices table columns ===' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current invoice status values
SELECT '=== invoices status values ===' AS info;
SELECT status, COUNT(*) as count
FROM public.invoices 
GROUP BY status
ORDER BY status;

-- Show sample invoices
SELECT '=== sample invoices ===' AS info;
SELECT id, invoice_number, status, created_at, updated_at
FROM public.invoices 
ORDER BY created_at DESC
LIMIT 5;
