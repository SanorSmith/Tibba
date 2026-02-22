-- ============================================================
-- Fix Payment Status Using Correct customer_invoices Table
-- Run this in Supabase SQL Editor
-- ============================================================

-- First, reset all payment_status to PENDING
UPDATE public.invoice_items 
SET payment_status = 'PENDING', payment_date = NULL;

-- Check customer_invoices table structure
SELECT '=== customer_invoices columns ===' AS info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_invoices' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current customer_invoices status values
SELECT '=== customer_invoices status values ===' AS info;
SELECT status, COUNT(*) as count
FROM public.customer_invoices 
GROUP BY status
ORDER BY status;

-- Update invoice items based on customer_invoices payment status
-- Mark items as PAID if their customer_invoice is marked as PAID
UPDATE public.invoice_items 
SET 
  payment_status = CASE 
    WHEN ci.status = 'PAID' THEN 'PAID'
    ELSE 'PENDING'
  END,
  payment_date = CASE 
    WHEN ci.status = 'PAID' THEN ci.updated_at
    ELSE NULL
  END
FROM public.customer_invoices ci
WHERE public.invoice_items.invoice_id = ci.id;

-- Verify the update
SELECT '=== updated payment_status values ===' AS info;
SELECT payment_status, COUNT(*) as count
FROM public.invoice_items 
GROUP BY payment_status
ORDER BY payment_status;

-- Show sample data with correct relationship
SELECT '=== sample invoice items with customer_invoices ===' AS info;
SELECT 
  ii.id,
  ii.invoice_id,
  ii.item_name,
  ii.payment_status,
  ii.payment_date,
  ci.status as customer_invoice_status,
  ci.invoice_number
FROM public.invoice_items ii
LEFT JOIN public.customer_invoices ci ON ii.invoice_id = ci.id
ORDER BY ii.created_at DESC
LIMIT 10;
