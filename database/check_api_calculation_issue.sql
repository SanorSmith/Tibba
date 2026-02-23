-- ============================================================
-- Check API Calculation Issue - Why Totals Show 0
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check what the API should be calculating for Baghdad Medical Center
SELECT 
  '=== Baghdad Medical Center (PRV001) Calculation Check ===' AS info;

SELECT 
  ii.provider_id,
  ii.provider_name,
  i.invoice_number,
  i.status as invoice_status,
  i.total_amount as invoice_total_amount,
  ii.service_fee as service_fee_amount,
  CASE 
    WHEN i.status = 'PAID' THEN 'PAID - Count in paid_amount'
    ELSE 'NOT PAID - Count in pending_amount'
  END as calculation_category,
  -- Simulate API calculation
  i.total_amount as api_total_calculation,
  CASE WHEN i.status = 'PAID' THEN i.total_amount ELSE 0 END as api_paid_calculation,
  CASE WHEN i.status != 'PAID' THEN i.total_amount ELSE 0 END as api_pending_calculation
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id = 'PRV001'
ORDER BY i.invoice_number;

-- Calculate expected totals for PRV001
SELECT 
  '=== Expected Totals for PRV001 ===' AS info;

SELECT 
  COUNT(*) as total_invoices,
  SUM(i.total_amount) as expected_total_amount,
  SUM(CASE WHEN i.status = 'PAID' THEN i.total_amount ELSE 0 END) as expected_paid_amount,
  SUM(CASE WHEN i.status != 'PAID' THEN i.total_amount ELSE 0 END) as expected_pending_amount
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id = 'PRV001';
