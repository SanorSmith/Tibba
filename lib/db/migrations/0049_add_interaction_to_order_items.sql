-- Add interaction, warning, and alternativemedicine columns to pharmacy_order_items
-- These fields are copied from the drug master when creating order items

ALTER TABLE pharmacy_order_items 
ADD COLUMN IF NOT EXISTS interaction text,
ADD COLUMN IF NOT EXISTS warning text,
ADD COLUMN IF NOT EXISTS alternativemedicine text;

-- Add comment
COMMENT ON COLUMN pharmacy_order_items.interaction IS 'Drug interactions copied from drug master';
COMMENT ON COLUMN pharmacy_order_items.warning IS 'Drug warnings copied from drug master';
COMMENT ON COLUMN pharmacy_order_items.alternativemedicine IS 'Alternative medicine options';
