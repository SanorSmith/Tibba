-- ============================================================
-- Debug Provider Totals - Match API Calculation Exactly
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check each invoice item with provider and invoice status
SELECT 
  '=== Detailed Invoice Items Breakdown ===' AS info;

SELECT 
  ii.id as item_id,
  i.invoice_number,
  i.status as invoice_status,
  ii.provider_id,
  ii.provider_name,
  ii.item_name,
  ii.service_fee,
  CASE 
    WHEN i.status = 'PAID' THEN 'PAID - Count in paid_amount'
    ELSE 'NOT PAID - Count in pending_amount'
  END as calculation_category
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL
ORDER BY ii.provider_id, i.invoice_number;

-- Calculate exact totals per provider (matching API logic)
SELECT 
  '=== Provider Totals (API Logic Match) ===' AS info;

SELECT 
  ii.provider_id,
  ii.provider_name,
  COUNT(*) as total_items,
  SUM(ii.service_fee) as total_service_fees,
  SUM(CASE WHEN i.status = 'PAID' THEN ii.service_fee ELSE 0 END) as paid_amount,
  SUM(CASE WHEN i.status != 'PAID' THEN ii.service_fee ELSE 0 END) as pending_amount,
  STRING_AGG(DISTINCT i.invoice_number, ', ' ORDER BY i.invoice_number) as invoice_numbers
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL
GROUP BY ii.provider_id, ii.provider_name
ORDER BY ii.provider_id;

-- Check for any NULL service fees or missing data
SELECT 
  '=== Data Quality Check ===' AS info;

SELECT 
  COUNT(*) as total_items,
  COUNT(CASE WHEN ii.service_fee IS NULL OR ii.service_fee = 0 THEN 1 END) as null_or_zero_fees,
  COUNT(CASE WHEN ii.provider_id IS NULL OR ii.provider_id = '' THEN 1 END) as null_provider_ids,
  COUNT(CASE WHEN i.status IS NULL THEN 1 END) as null_invoice_status
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL OR (ii.provider_id IS NULL AND i.id IN (
  SELECT DISTINCT invoice_id FROM public.invoice_items WHERE provider_id IS NOT NULL
));
