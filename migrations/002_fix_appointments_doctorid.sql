-- =============================================================================
-- FIX APPOINTMENTS TABLE DOCTOR ID REFERENCE
-- =============================================================================
-- This script updates the appointments table to use staff IDs instead of
-- referencing a potentially different stakeholders table

-- First, let's see what foreign key constraints exist
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'appointments';

-- Drop the existing foreign key constraint on doctorid if it exists
-- (You may need to adjust the constraint name based on the query above)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_doctorid_fkey' 
        AND table_name = 'appointments'
    ) THEN
        ALTER TABLE appointments DROP CONSTRAINT appointments_doctorid_fkey;
        RAISE NOTICE 'Dropped appointments_doctorid_fkey constraint';
    END IF;
END $$;

-- Now let's check what staff IDs look like
SELECT 'Sample staff IDs:' as info;
SELECT id, firstname, lastname, role FROM staff LIMIT 5;

-- Check if there are any appointments with doctor IDs
SELECT 'Current appointments with doctor IDs:' as info;
SELECT COUNT(*) as count, doctorid FROM appointments GROUP BY doctorid;

-- If you want to update existing appointments to use valid staff IDs,
-- you can run this (uncomment when ready):
/*
UPDATE appointments 
SET doctorid = (
    SELECT id 
    FROM staff 
    LIMIT 1
) 
WHERE doctorid IS NOT NULL;
*/

-- Add a new foreign key constraint to reference the staff table
-- Note: This assumes you have a 'staff' table with 'id' column
-- If the staff table has a different name or structure, adjust accordingly
DO $$
BEGIN
    -- Check if staff table exists and has id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'staff' 
        AND column_name = 'id'
    ) THEN
        ALTER TABLE appointments 
        ADD CONSTRAINT appointments_doctorid_staff_fkey 
        FOREIGN KEY (doctorid) REFERENCES staff(id) 
        ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint to staff table';
    ELSE
        RAISE NOTICE 'Staff table or id column not found - skipping foreign key constraint';
    END IF;
END $$;

-- Verify the changes
SELECT 'Final table structure:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
    AND column_name IN ('doctorid', 'patientid')
ORDER BY column_name;
