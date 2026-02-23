-- ============================================================
-- Test Invoice Status Fix for Provider Reports
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check a few sample invoices with their status and provider info
SELECT 
  '=== Sample Invoice Items with Status ===' AS info;

SELECT 
  ii.id,
  ii.provider_id,
  ii.provider_name,
  ii.service_fee,
  ii.payment_status as service_payment_status,
  i.invoice_number,
  i.status as invoice_status,
  i.invoice_date,
  CASE 
    WHEN i.status = 'PAID' THEN 'INVOICE PAID - Should count as paid'
    ELSE 'INVOICE NOT PAID - Should count as pending'
  END as calculation_logic
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL
ORDER BY i.invoice_date DESC
LIMIT 10;

-- Check provider totals by invoice status
SELECT 
  '=== Provider Totals by Invoice Status ===' AS info;

SELECT 
  ii.provider_id,
  ii.provider_name,
  COUNT(*) as total_items,
  SUM(ii.service_fee) as total_service_fees,
  COUNT(CASE WHEN i.status = 'PAID' THEN 1 END) as paid_items,
  SUM(CASE WHEN i.status = 'PAID' THEN ii.service_fee ELSE 0 END) as paid_amount,
  COUNT(CASE WHEN i.status != 'PAID' THEN 1 END) as pending_items,
  SUM(CASE WHEN i.status != 'PAID' THEN ii.service_fee ELSE 0 END) as pending_amount
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL
GROUP BY ii.provider_id, ii.provider_name
ORDER BY total_service_fees DESC;
