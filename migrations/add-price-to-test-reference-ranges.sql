-- Add price column to test_reference_ranges table
-- This allows storing the price for each test when registering

ALTER TABLE test_reference_ranges 
ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);

-- Add comment to the column
COMMENT ON COLUMN test_reference_ranges.price IS 'Price for the test';
