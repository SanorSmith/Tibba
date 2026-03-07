-- =====================================================
-- INVOICE_RETURN_ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_return_items (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Related Return
  return_id             UUID NOT NULL REFERENCES invoice_returns(id) ON DELETE CASCADE,
  
  -- Item Details
  item_id               UUID NOT NULL, -- Invoice item ID
  invoice_item_id       UUID NOT NULL, -- Invoice item ID (duplicate for clarity)
  item_code             VARCHAR(50),
  item_name             VARCHAR(255),
  item_name_ar          TEXT,
  
  -- Quantities
  original_quantity     DECIMAL(10,2) NOT NULL,
  return_quantity       DECIMAL(10,2) NOT NULL,
  remaining_quantity    DECIMAL(10,2) GENERATED ALWAYS AS (original_quantity - return_quantity) STORED,
  
  -- Financial
  unit_price            DECIMAL(15,2) NOT NULL,
  return_amount         DECIMAL(15,2) NOT NULL,
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            VARCHAR(255),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            VARCHAR(255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_return_items_return ON invoice_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_invoice_return_items_item ON invoice_return_items(item_id);
CREATE INDEX IF NOT EXISTS idx_invoice_return_items_invoice_item ON invoice_return_items(invoice_item_id);

-- Comments
COMMENT ON TABLE invoice_return_items IS 'Individual items within invoice returns';
COMMENT ON COLUMN invoice_return_items.return_id IS 'Reference to the main return record';
COMMENT ON COLUMN invoice_return_items.item_id IS 'Invoice item being returned';
COMMENT ON COLUMN invoice_return_items.original_quantity IS 'Original quantity from invoice';
COMMENT ON COLUMN invoice_return_items.return_quantity IS 'Quantity being returned';
COMMENT ON COLUMN invoice_return_items.remaining_quantity IS 'Calculated remaining quantity';

-- Disable RLS for development
ALTER TABLE invoice_return_items DISABLE ROW LEVEL SECURITY;
