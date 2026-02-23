-- ============================================================
-- Check Why INV-2026-00027 Not Showing in Service Provider Reports
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check if this invoice should be included in Service Provider Reports
SELECT 
  '=== Service Provider Reports Inclusion Check ===' AS info;

SELECT 
  ii.id as item_id,
  i.invoice_number,
  i.status as invoice_status,
  ii.payment_status as service_payment_status,
  ii.provider_id,
  ii.provider_name,
  ii.service_fee,
  i.total_amount as invoice_total_amount,
  ii.item_name,
  i.patient_name,
  i.invoice_date,
  CASE 
    WHEN ii.provider_id IS NULL OR ii.provider_id = '' THEN '❌ NO PROVIDER - Will not show in Provider Reports'
    ELSE '✅ SHOULD SHOW IN SERVICE PROVIDER REPORTS'
  END as should_display_in_provider_reports
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE i.invoice_number = 'INV-2026-00027';

-- Check all invoices for National Laboratory Services (PRV003)
SELECT 
  '=== All Invoices for PRV003 (National Laboratory Services) ===' AS info;

SELECT 
  i.invoice_number,
  i.status as invoice_status,
  i.total_amount,
  i.invoice_date,
  ii.service_fee,
  ii.payment_status as service_payment_status,
  CASE 
    WHEN ii.provider_id IS NULL OR ii.provider_id = '' THEN '❌ NO PROVIDER'
    ELSE '✅ HAS PROVIDER'
  END as provider_status
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id = 'PRV003'
ORDER BY i.invoice_date DESC;
