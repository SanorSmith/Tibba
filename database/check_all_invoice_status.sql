-- ============================================================
-- Check All Invoice Statuses for Provider Calculations
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check all invoices with their status
SELECT 
  '=== All Invoice Statuses ===' AS info;

SELECT 
  i.invoice_number,
  i.status as invoice_status,
  i.total_amount,
  i.amount_paid,
  i.balance_due,
  COUNT(ii.id) as service_items_count,
  SUM(ii.service_fee) as total_service_fees
FROM public.invoices i
LEFT JOIN public.invoice_items ii ON i.id = ii.invoice_id
WHERE ii.provider_id IS NOT NULL OR i.id IN (
  SELECT DISTINCT invoice_id FROM public.invoice_items WHERE provider_id IS NOT NULL
)
GROUP BY i.invoice_number, i.status, i.total_amount, i.amount_paid, i.balance_due, i.invoice_date
ORDER BY i.invoice_date DESC;

-- Check specifically for non-PAID invoices with provider items
SELECT 
  '=== Non-PAID Invoices with Provider Items ===' AS info;

SELECT 
  i.invoice_number,
  i.status as invoice_status,
  i.total_amount,
  i.amount_paid,
  i.balance_due,
  ii.provider_id,
  ii.provider_name,
  ii.service_fee
FROM public.invoices i
JOIN public.invoice_items ii ON i.id = ii.invoice_id
WHERE i.status != 'PAID' AND ii.provider_id IS NOT NULL
ORDER BY i.invoice_date DESC, ii.provider_id;
