-- ============================================================
-- Fix Invoice Relationship for Service Payments
-- Run this in Supabase SQL Editor
-- ============================================================

-- Recreate the foreign key constraint with VARCHAR types
ALTER TABLE public.invoice_items 
ADD CONSTRAINT invoice_items_invoice_id_fkey 
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the relationship
SELECT '=== constraints ===' AS info;
SELECT constraint_name, table_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
AND table_name = 'invoice_items'
AND constraint_type = 'FOREIGN KEY';
