-- ============================================================
-- Verify All Provider Invoices - Check Invoice Counts
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check invoice counts per provider
SELECT 
  '=== Invoice Counts Per Provider ===' AS info;

SELECT 
  ii.provider_id,
  ii.provider_name,
  COUNT(DISTINCT i.invoice_number) as unique_invoices,
  COUNT(ii.id) as total_service_items,
  STRING_AGG(DISTINCT i.invoice_number, ', ' ORDER BY i.invoice_number) as invoice_list
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL AND ii.provider_id != ''
GROUP BY ii.provider_id, ii.provider_name
ORDER BY ii.provider_id;

-- Check if any provider has multiple invoices
SELECT 
  '=== Providers with Multiple Invoices ===' AS info;

SELECT 
  ii.provider_id,
  ii.provider_name,
  COUNT(DISTINCT i.invoice_number) as invoice_count,
  STRING_AGG(DISTINCT i.invoice_number, ', ' ORDER BY i.invoice_number) as invoices
FROM public.invoice_items ii
JOIN public.invoices i ON ii.invoice_id = i.id
WHERE ii.provider_id IS NOT NULL AND ii.provider_id != ''
GROUP BY ii.provider_id, ii.provider_name
HAVING COUNT(DISTINCT i.invoice_number) > 1
ORDER BY invoice_count DESC;
