-- Add pharmacist notes field to pharmacy_orders table
-- This field stores pharmacist notes for the entire order (order-level notes)

ALTER TABLE pharmacy_orders 
ADD COLUMN IF NOT EXISTS pharmacistnotes TEXT;

-- Add prescriber name field to pharmacy_orders table
-- This field stores the prescribing doctor's name as free text
ALTER TABLE pharmacy_orders 
ADD COLUMN IF NOT EXISTS prescribername TEXT;

-- Add comments for documentation
COMMENT ON COLUMN pharmacy_orders.pharmacistnotes IS 'Pharmacist notes for the entire order (order-level notes)';
COMMENT ON COLUMN pharmacy_orders.prescribername IS 'Prescribing doctor name (free text input)';
