-- Add orderid column to patient_reminders table to link reminders to orders
ALTER TABLE patient_reminders ADD COLUMN IF NOT EXISTS orderid TEXT;
CREATE INDEX IF NOT EXISTS patient_reminders_order_idx ON patient_reminders(orderid);
