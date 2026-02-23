-- ============================================================
-- Check Invoice INV-2026-00027 - Why Not Showing in Service Payments
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check invoice details
SELECT 
  '=== Invoice INV-2026-00027 Details ===' AS info;

SELECT 
  i.id,
  i.invoice_number,
  i.status as invoice_status,
  i.patient_name,
  i.total_amount,
  i.amount_paid,
  i.balance_due,
  i.invoice_date
FROM public.invoices i
WHERE i.invoice_number = 'INV-2026-00027';

-- Check invoice items for this invoice
SELECT 
  '=== Invoice Items for INV-2026-00027 ===' AS info;

SELECT 
  ii.id,
  ii.invoice_id,
  ii.item_name,
  ii.quantity,
  ii.unit_price,
  ii.service_fee,
  ii.payment_status as service_payment_status,
  ii.provider_id,
  ii.provider_name,
  ii.item_code,
  CASE 
    WHEN ii.provider_id IS NULL OR ii.provider_id = '' THEN '❌ NO PROVIDER - Will not show in Service Payments'
    WHEN i.status != 'PAID' THEN '❌ INVOICE NOT PAID - Will not show in Service Payments'
    WHEN ii.payment_status = 'PAID' THEN '❌ ALREADY PAID TO PROVIDER - Will not show in Service Payments'
    ELSE '✅ SHOULD SHOW IN SERVICE PAYMENTS'
  END as should_display_status
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE i.invoice_number = 'INV-2026-00027';
