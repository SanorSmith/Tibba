-- ============================================================
-- Fix Service Payments Logic - Show Only UNPAID Invoices
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, reset all payment_status to PENDING (unpaid to supplier)
UPDATE public.invoice_items 
SET payment_status = 'PENDING', payment_date = NULL;

-- Check what status values exist in invoices table
SELECT '=== invoices status values ===' AS info;
SELECT status, COUNT(*) as count
FROM public.invoices 
GROUP BY status
ORDER BY status;

-- Update invoice items based on invoices table status
-- Logic: If invoice is PAID by customer, service is PENDING payment to supplier
-- If invoice is NOT PAID by customer, service should not appear in service payments
UPDATE public.invoice_items 
SET 
  payment_status = CASE 
    WHEN i.status = 'PAID' THEN 'PENDING'  -- Customer paid, but supplier not paid yet
    WHEN i.status IN ('DRAFT', 'SENT', 'OVERDUE') THEN 'PENDING'  -- Customer hasn't paid
    ELSE 'PENDING'  -- Default to pending
  END,
  payment_date = NULL  -- No payment to supplier yet
FROM public.invoices i
WHERE public.invoice_items.invoice_id = i.id;

-- Verify the update
SELECT '=== payment_status values ===' AS info;
SELECT payment_status, COUNT(*) as count
FROM public.invoice_items 
GROUP BY payment_status
ORDER BY payment_status;

-- Show sample data
SELECT '=== sample invoice items ===' AS info;
SELECT 
  ii.id,
  ii.invoice_id,
  ii.item_name,
  ii.payment_status,
  i.status as invoice_status,
  i.invoice_number
FROM public.invoice_items ii
LEFT JOIN public.invoices i ON ii.invoice_id = i.id
ORDER BY ii.created_at DESC
LIMIT 10;
