-- ============================================================
-- Verify Service Share Payment Workflow
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check the complete workflow: Customer Invoices -> Service Payments
SELECT '=== Complete Workflow Verification ===' AS info;

-- Step 1: Show all PAID customer invoices (should be source for Service Payments)
SELECT '=== Step 1: PAID Customer Invoices ===' AS step;
SELECT 
  invoice_number,
  status,
  created_at,
  'CUSTOMER PAID - Ready for Service Payment' as workflow_status
FROM public.invoices 
WHERE status = 'PAID'
ORDER BY invoice_number;

-- Step 2: Show what appears in Service Payments (PAID invoices + PENDING service payment)
SELECT '=== Step 2: Service Payments - What Should Appear ===' AS step;
SELECT 
  i.invoice_number,
  i.status as customer_invoice_status,
  ii.item_name,
  ii.payment_status as supplier_payment_status,
  CASE 
    WHEN i.status = 'PAID' AND (ii.payment_status IS NULL OR ii.payment_status = 'PENDING') 
    THEN 'SHOW - Ready to pay supplier'
    ELSE 'HIDE'
  END as service_payments_action
FROM public.invoices i
JOIN public.invoice_items ii ON i.id = ii.invoice_id
WHERE i.status = 'PAID'  -- Only paid customer invoices
ORDER BY i.invoice_number, ii.item_name;

-- Step 3: Show what should NOT appear in Service Payments
SELECT '=== Step 3: What Should NOT Appear ===' AS step;
SELECT 
  i.invoice_number,
  i.status as customer_invoice_status,
  ii.payment_status as supplier_payment_status,
  CASE 
    WHEN i.status != 'PAID' THEN 'HIDE - Customer not paid yet'
    WHEN ii.payment_status = 'PAID' THEN 'HIDE - Supplier already paid'
    ELSE 'UNKNOWN'
  END as hide_reason
FROM public.invoices i
JOIN public.invoice_items ii ON i.id = ii.invoice_id
WHERE i.status != 'PAID' OR ii.payment_status = 'PAID'
ORDER BY i.invoice_number, ii.item_name;

-- Summary counts
SELECT '=== Workflow Summary ===' AS info;
SELECT 
  COUNT(*) as total_invoices,
  COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_customer_invoices,
  COUNT(CASE WHEN status != 'PAID' THEN 1 END) as unpaid_customer_invoices
FROM public.invoices;
