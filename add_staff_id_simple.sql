-- Simple script to add staff_id column to appointments table
-- Run this in your database client or psql

-- Step 1: Add the staff_id column
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS staff_id UUID;

-- Step 2: Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
    AND column_name = 'staff_id';

-- Step 3: (Optional) Populate staff_id with existing doctorid values
-- UPDATE appointments 
-- SET staff_id = doctorid 
-- WHERE doctorid IS NOT NULL;

-- Step 4: Add foreign key constraint to staff table (if staff table exists)
-- ALTER TABLE appointments 
-- ADD CONSTRAINT appointments_staff_id_fkey 
-- FOREIGN KEY (staff_id) REFERENCES staff(id) 
-- ON DELETE SET NULL;

-- Step 5: Show the final structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
    AND column_name IN ('doctorid', 'staff_id', 'patientid')
ORDER BY column_name;
