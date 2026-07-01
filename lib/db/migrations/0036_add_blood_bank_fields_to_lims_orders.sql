-- Add blood bank specific fields to lims_orders table
ALTER TABLE lims_orders 
ADD COLUMN IF NOT EXISTS blood_type TEXT,
ADD COLUMN IF NOT EXISTS blood_comment TEXT;
