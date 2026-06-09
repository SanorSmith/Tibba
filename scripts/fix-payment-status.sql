-- Fix Payment Status for Dispensed Orders
-- This updates all invoices for dispensed orders to PAID status
-- Run this once to fix existing orders

BEGIN;

-- Update invoices for dispensed orders to PAID
UPDATE pharmacy_invoices 
SET 
  status = 'PAID', 
  updatedat = NOW()
WHERE 
  status = 'ISSUED' 
  AND orderid IN (
    SELECT orderid 
    FROM pharmacy_orders 
    WHERE status = 'DISPENSED'
  );

-- Show the results
SELECT 
  'Updated ' || COUNT(*) || ' invoices to PAID status' as result
FROM pharmacy_invoices
WHERE status = 'PAID' 
  AND updatedat > NOW() - INTERVAL '1 minute';

COMMIT;
