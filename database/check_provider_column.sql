-- ============================================================
-- Check provider_id column type in invoice_items
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check the current column type of provider_id
SELECT '=== provider_id column type ===' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoice_items' 
AND column_name = 'provider_id'
AND table_schema = 'public';

-- Check if service_fee column exists
SELECT '=== service_fee column check ===' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoice_items' 
AND column_name = 'service_fee'
AND table_schema = 'public';

-- Check if payment_status column exists
SELECT '=== payment_status column check ===' AS info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoice_items' 
AND column_name = 'payment_status'
AND table_schema = 'public';

-- Show sample data to see current structure
SELECT '=== sample invoice_items data ===' AS info;
SELECT id, provider_id, service_fee, payment_status
FROM public.invoice_items 
LIMIT 3;
