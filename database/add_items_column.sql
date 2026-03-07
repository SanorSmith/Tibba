-- Add items column to invoice_returns table
ALTER TABLE invoice_returns ADD COLUMN IF NOT EXISTS items JSONB;

-- Add comment
COMMENT ON COLUMN invoice_returns.items IS 'Return items stored as JSON';
