-- Add payment_frequency column to employee_compensation table
ALTER TABLE employee_compensation 
ADD COLUMN IF NOT EXISTS payment_frequency VARCHAR(20) DEFAULT 'MONTHLY' 
CHECK (payment_frequency IN ('WEEKLY', 'BI-WEEKLY', 'MONTHLY', 'QUARTERLY'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_employee_compensation_payment_frequency 
ON employee_compensation(payment_frequency);

-- Update existing records to have default value
UPDATE employee_compensation 
SET payment_frequency = 'MONTHLY' 
WHERE payment_frequency IS NULL;

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'employee_compensation' 
AND column_name = 'payment_frequency';
