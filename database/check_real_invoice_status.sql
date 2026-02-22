-- ============================================================
-- Check Real Invoice Status System
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check invoices table structure completely
SELECT '=== full invoices table structure ===' AS info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there's a customer_invoices table
SELECT '=== customer_invoices table check ===' AS info;
SELECT table_name, table_schema
FROM information_schema.tables 
WHERE table_name = 'customer_invoices' AND table_schema = 'public';

-- Check all tables that might contain invoice status
SELECT '=== all tables with status column ===' AS info;
SELECT table_name, column_name, data_type
FROM information_schema.columns 
WHERE column_name = 'status' 
AND table_schema = 'public'
ORDER BY table_name;

-- Show sample data from invoices table
SELECT '=== sample invoices data ===' AS info;
SELECT * FROM public.invoices 
ORDER BY created_at DESC
LIMIT 3;

-- Check if there are any payment-related columns
SELECT '=== payment-related columns in invoices ===' AS info;
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'invoices' 
AND table_schema = 'public'
AND (column_name LIKE '%payment%' OR column_name LIKE '%paid%' OR column_name LIKE '%status%')
ORDER BY column_name;
