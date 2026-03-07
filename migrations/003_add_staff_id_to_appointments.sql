-- =============================================================================
-- ADD STAFF_ID TO APPOINTMENTS TABLE
-- =============================================================================
-- This script adds a staff_id field to the appointments table to properly
-- reference staff members instead of using doctorid

-- Add staff_id column to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS staff_id UUID;

-- Check if the column was added successfully
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
    AND column_name = 'staff_id';

-- If you want to populate staff_id with existing doctorid values (if they match)
-- Uncomment this after verifying the data:
/*
UPDATE appointments 
SET staff_id = doctorid 
WHERE doctorid IS NOT NULL;
*/

-- Add foreign key constraint to reference staff table
ALTER TABLE appointments 
ADD CONSTRAINT appointments_staff_id_fkey 
FOREIGN KEY (staff_id) REFERENCES staff(id) 
ON DELETE SET NULL;

-- Verify the constraint was added
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
    AND tc.table_name = 'appointments'
    AND kcu.column_name = 'staff_id';

-- Show final table structure for relevant columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
    AND column_name IN ('doctorid', 'staff_id', 'patientid')
ORDER BY column_name;
