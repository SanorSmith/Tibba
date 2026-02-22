-- ============================================================
-- Debug Invoice Status for INV-2026-00018
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check the actual status of INV-2026-00018
SELECT '=== INV-2026-00018 status ===' AS info;
SELECT id, invoice_number, status, created_at, updated_at
FROM public.invoices 
WHERE invoice_number = 'INV-2026-00018';

-- Check all invoice items for this invoice
SELECT '=== INV-2026-00018 items ===' AS info;
SELECT 
  ii.id,
  ii.invoice_id,
  ii.item_name,
  ii.payment_status,
  ii.payment_batch_id,
  ii.payment_date,
  ii.provider_id,
  ii.provider_name,
  ii.service_fee
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE i.invoice_number = 'INV-2026-00018';

-- Check all possible status values in invoices
SELECT '=== all invoice statuses ===' AS info;
SELECT DISTINCT status, COUNT(*) as count
FROM public.invoices 
GROUP BY status
ORDER BY status;
