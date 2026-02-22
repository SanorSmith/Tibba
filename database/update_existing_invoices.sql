-- ============================================================
-- Update Existing Invoice Items with Payment Status
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check if payment_status column exists and its values
SELECT '=== payment_status column check ===' AS info;
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'invoice_items' AND table_schema = 'public'
AND column_name = 'payment_status';

-- Check current payment_status values
SELECT '=== current payment_status values ===' AS info;
SELECT payment_status, COUNT(*) as count
FROM public.invoice_items 
GROUP BY payment_status
ORDER BY payment_status;

-- Update existing invoice items based on invoice payment status
-- Mark items as PAID if their invoice is marked as paid
UPDATE public.invoice_items 
SET 
  payment_status = 'PAID',
  payment_date = invoices.updated_at
FROM public.invoices 
WHERE public.invoice_items.invoice_id = public.invoices.id 
AND public.invoices.status = 'PAID'
AND public.invoice_items.payment_status IS NULL OR public.invoice_items.payment_status = 'PENDING';

-- Verify the update
SELECT '=== updated payment_status values ===' AS info;
SELECT payment_status, COUNT(*) as count
FROM public.invoice_items 
GROUP BY payment_status
ORDER BY payment_status;

-- Show some sample data
SELECT '=== sample invoice items ===' AS info;
SELECT 
  ii.id,
  ii.invoice_id,
  ii.item_name,
  ii.payment_status,
  ii.payment_date,
  i.status as invoice_status,
  i.invoice_number
FROM public.invoice_items ii
LEFT JOIN public.invoices i ON ii.invoice_id = i.id
ORDER BY ii.created_at DESC
LIMIT 10;
