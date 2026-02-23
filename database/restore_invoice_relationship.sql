-- ============================================================
-- Restore Foreign Key Relationship Between invoice_items and invoices
-- Run this in Supabase SQL Editor
-- ============================================================

-- Check current foreign keys on invoice_items
SELECT '=== Current foreign keys on invoice_items ===' AS info;
SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'invoice_items' 
AND tc.table_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY';

-- Recreate the foreign key constraint between invoice_items and invoices
ALTER TABLE public.invoice_items
ADD CONSTRAINT invoice_items_invoice_id_fkey
FOREIGN KEY (invoice_id) REFERENCES public.invoices(id)
ON DELETE CASCADE ON UPDATE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the constraint was created
SELECT '=== Verification - Foreign keys after recreation ===' AS info;
SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_name = 'invoice_items' 
AND tc.table_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY';
