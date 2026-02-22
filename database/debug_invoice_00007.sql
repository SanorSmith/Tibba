-- ============================================================
-- Debug Invoice Status for INV-2026-00007
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check the actual status of INV-2026-00018
SELECT '=== INV-2026-00007 status in invoices table ===' AS info;
SELECT id, invoice_number, status, created_at, updated_at
FROM public.invoices 
WHERE invoice_number = 'INV-2026-00007';

-- Check all invoice items for this invoice
SELECT '=== INV-2026-00007 items in invoice_items table ===' AS info;
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
WHERE i.invoice_number = 'INV-2026-00007';

-- Check what the Service Payments API would return for this invoice
SELECT '=== What Service Payments API would see for INV-2026-00007 ===' AS info;
SELECT 
  ii.id,
  ii.invoice_id,
  ii.item_name,
  ii.payment_status as service_payment_status,
  i.status as invoice_status,
  i.invoice_number,
  CASE 
    WHEN i.status = 'PAID' AND (ii.payment_status IS NULL OR ii.payment_status = 'PENDING') THEN 'SHOW IN SERVICE PAYMENTS'
    WHEN i.status != 'PAID' THEN 'HIDE - Invoice not paid by customer'
    WHEN ii.payment_status = 'PAID' THEN 'HIDE - Already paid to supplier'
    ELSE 'UNKNOWN'
  END as api_action
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE i.invoice_number = 'INV-2026-00007';
