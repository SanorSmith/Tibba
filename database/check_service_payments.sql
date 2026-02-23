-- ============================================================
-- Check Service Payments Data - What Should Show
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check all invoice items with provider info
SELECT 
  '=== All Invoice Items with Provider Info ===' AS info;

SELECT 
  ii.id,
  ii.invoice_id,
  i.invoice_number,
  i.status as invoice_status,
  ii.payment_status as service_payment_status,
  ii.provider_id,
  ii.provider_name,
  ii.service_fee,
  ii.item_name,
  i.patient_name,
  CASE 
    WHEN i.status != 'PAID' THEN 'HIDDEN - Invoice not paid by customer'
    WHEN ii.payment_status = 'PAID' THEN 'HIDDEN - Already paid to provider'
    ELSE 'SHOULD SHOW - Pending payment to provider'
  END as display_status
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL
ORDER BY i.invoice_date DESC, ii.provider_id;

-- Count what should show vs what's hidden
SELECT 
  '=== Service Payments Summary ===' AS info;

SELECT 
  COUNT(*) as total_provider_items,
  COUNT(CASE WHEN i.status != 'PAID' THEN 1 END) as hidden_invoice_not_paid,
  COUNT(CASE WHEN ii.payment_status = 'PAID' THEN 1 END) as hidden_already_paid_to_provider,
  COUNT(CASE WHEN i.status = 'PAID' AND ii.payment_status != 'PAID' THEN 1 END) as should_show_pending_payments
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL;
