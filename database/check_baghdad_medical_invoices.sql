-- ============================================================
-- Check All Invoices for Baghdad Medical Center (PRV001)
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check all invoice items for Baghdad Medical Center
SELECT 
  '=== All Invoice Items for PRV001 (Baghdad Medical Center) ===' AS info;

SELECT 
  ii.id as item_id,
  i.invoice_number,
  i.status as invoice_status,
  ii.payment_status as service_payment_status,
  ii.service_fee,
  ii.item_name,
  i.patient_name,
  i.invoice_date,
  CASE 
    WHEN i.status = 'PAID' THEN 'PAID - Should count in paid_amount'
    ELSE 'NOT PAID - Should count in pending_amount'
  END as calculation_logic,
  CASE 
    WHEN ii.provider_id IS NULL OR ii.provider_id = '' THEN '❌ NO PROVIDER - Will not show'
    ELSE '✅ HAS PROVIDER - Should show'
  END as provider_status
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id = 'PRV001'
ORDER BY i.invoice_date DESC;

-- Calculate expected totals for PRV001
SELECT 
  '=== Expected Totals for PRV001 ===' AS info;

SELECT 
  COUNT(*) as total_items,
  COUNT(DISTINCT i.invoice_number) as unique_invoices,
  SUM(ii.service_fee) as total_service_fees,
  SUM(CASE WHEN i.status = 'PAID' THEN ii.service_fee ELSE 0 END) as paid_service_fees,
  SUM(CASE WHEN i.status != 'PAID' THEN ii.service_fee ELSE 0 END) as pending_service_fees
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id = 'PRV001';
