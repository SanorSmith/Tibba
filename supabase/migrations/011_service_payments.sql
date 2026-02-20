-- Migration 011: Add service provider payment fields to invoice_items
-- This enables the Service Share Payments feature to track which provider
-- performed each service, the fee owed, and the payment status.

ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS provider_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS provider_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS service_fee DECIMAL(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID')),
  ADD COLUMN IF NOT EXISTS payment_batch_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_date DATE;

-- Index for fast lookup by provider and payment status
CREATE INDEX IF NOT EXISTS idx_invoice_items_provider ON invoice_items(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_payment_status ON invoice_items(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_payment_batch ON invoice_items(payment_batch_id);

-- Backfill: set payment_status to PENDING for all existing rows that have no status
UPDATE invoice_items SET payment_status = 'PENDING' WHERE payment_status IS NULL;
