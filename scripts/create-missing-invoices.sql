-- Create invoices for dispensed orders that don't have invoices
-- This fixes orders that were dispensed before invoice creation was implemented

BEGIN;

-- Insert invoices for dispensed orders without invoices
INSERT INTO pharmacy_invoices (
  orderid,
  patientid,
  invoicenumber,
  status,
  subtotal,
  insurancecovered,
  patientcopay,
  total,
  createdat,
  updatedat
)
SELECT 
  po.orderid,
  po.patientid,
  'INV-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)) as invoicenumber,
  'PAID' as status,
  COALESCE(SUM(poi.quantity * COALESCE(poi.unitprice::numeric, 0)), 0) as subtotal,
  COALESCE(SUM(poi.quantity * COALESCE(poi.unitprice::numeric, 0)) * 0.2, 0) as insurancecovered,
  COALESCE(SUM(poi.quantity * COALESCE(poi.unitprice::numeric, 0)) * 0.7, 0) as patientcopay,
  COALESCE(SUM(poi.quantity * COALESCE(poi.unitprice::numeric, 0)), 0) as total,
  po.dispensedat as createdat,
  NOW() as updatedat
FROM pharmacy_orders po
LEFT JOIN pharmacy_order_items poi ON poi.orderid = po.orderid
WHERE po.status = 'DISPENSED'
  AND NOT EXISTS (
    SELECT 1 FROM pharmacy_invoices pi WHERE pi.orderid = po.orderid
  )
GROUP BY po.orderid, po.patientid, po.dispensedat;

-- Show the results
SELECT 
  'Created ' || COUNT(*) || ' invoices for dispensed orders' as result
FROM pharmacy_invoices
WHERE createdat > NOW() - INTERVAL '1 minute';

-- Show the created invoices
SELECT 
  invoicenumber,
  orderid,
  status,
  total,
  createdat
FROM pharmacy_invoices
WHERE createdat > NOW() - INTERVAL '1 minute'
ORDER BY createdat DESC;

COMMIT;
