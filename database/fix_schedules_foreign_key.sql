-- Fix the employee_schedules table to use staff instead of employees

-- Drop the existing foreign key constraint
ALTER TABLE employee_schedules DROP CONSTRAINT IF EXISTS employee_schedules_employee_fkey;

-- Add new foreign key constraint to staff table
ALTER TABLE employee_schedules 
ADD CONSTRAINT employee_schedules_staff_fkey 
FOREIGN KEY (employee_id) REFERENCES staff(staffid) ON DELETE CASCADE;

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
  AND tc.table_name = 'employee_schedules';
