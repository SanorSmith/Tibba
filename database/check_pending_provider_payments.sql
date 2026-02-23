-- ============================================================
-- Check Pending Provider Payments (Should Show in Service Payments)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check invoices that should show in Service Payments
SELECT 
  '=== Pending Provider Payments (Should Show) ===' AS info;

SELECT 
  ii.id as item_id,
  i.invoice_number,
  i.status as invoice_status,
  ii.payment_status as service_payment_status,
  ii.provider_id,
  ii.provider_name,
  ii.service_fee,
  ii.item_name,
  i.patient_name,
  i.invoice_date,
  CASE 
    WHEN i.status = 'PAID' AND ii.payment_status != 'PAID' THEN '✅ SHOULD SHOW'
    ELSE '❌ SHOULD NOT SHOW'
  END as should_display
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL
ORDER BY should_display DESC, i.invoice_date DESC;

-- Count summary
SELECT 
  '=== Summary ===' AS info;

SELECT 
  COUNT(*) as total_provider_items,
  COUNT(CASE WHEN i.status = 'PAID' AND ii.payment_status != 'PAID' THEN 1 END) as should_show_count,
  COUNT(CASE WHEN i.status != 'PAID' OR ii.payment_status = 'PAID' THEN 1 END) as should_not_show_count
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL;
