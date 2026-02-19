-- =====================================================
-- INVOICE RETURNS TABLE
-- =====================================================

-- Create invoice_returns table (without foreign keys for now)
CREATE TABLE IF NOT EXISTS invoice_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Return Information
  return_number VARCHAR(50) UNIQUE NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Original Invoice Reference (stored as text for now)
  invoice_id UUID,
  invoice_number VARCHAR(50),
  
  -- Patient Information (copied from invoice)
  patient_id VARCHAR(50),
  patient_name VARCHAR(255),
  patient_name_ar VARCHAR(255),
  
  -- Return Details
  reason_ar TEXT,
  reason_en TEXT,
  return_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Payment Information
  refund_method VARCHAR(50), -- CASH, CARD, BANK_TRANSFER, CREDIT_NOTE
  refund_date DATE,
  refund_reference VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, REFUNDED
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Additional Information
  notes TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_invoice_returns_org ON invoice_returns(organization_id);
CREATE INDEX idx_invoice_returns_return_number ON invoice_returns(return_number);
CREATE INDEX idx_invoice_returns_invoice_id ON invoice_returns(invoice_id);
CREATE INDEX idx_invoice_returns_invoice_number ON invoice_returns(invoice_number);
CREATE INDEX idx_invoice_returns_patient_id ON invoice_returns(patient_id);
CREATE INDEX idx_invoice_returns_return_date ON invoice_returns(return_date);
CREATE INDEX idx_invoice_returns_status ON invoice_returns(status);

-- Function to generate return number in format: RET-YYYY-XXXXX
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  return_number TEXT;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(r.return_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoice_returns r
  WHERE r.return_number LIKE 'RET-' || current_year || '-%';
  
  -- If no returns exist for this year, start from 1
  IF next_number IS NULL THEN
    next_number := 1;
  END IF;
  
  -- Format: RET-YYYY-XXXXX (5 digits, zero-padded)
  return_number := 'RET-' || current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN return_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate return number before insert
CREATE OR REPLACE FUNCTION set_return_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if return_number is NULL or empty
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := generate_return_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoice_returns table
DROP TRIGGER IF EXISTS trigger_set_return_number ON invoice_returns;
CREATE TRIGGER trigger_set_return_number
  BEFORE INSERT ON invoice_returns
  FOR EACH ROW
  EXECUTE FUNCTION set_return_number();

-- =====================================================
-- DEMO DATA - Sample Returns
-- =====================================================
-- Note: Demo data creation is skipped to avoid dependency issues
-- You can manually insert demo data after all migrations are complete

-- Example manual insert (run after migration 004_invoices.sql):
/*
DO $$
DECLARE
  org_id UUID;
  inv_id UUID;
  inv_num VARCHAR(50);
BEGIN
  SELECT id INTO org_id FROM organizations LIMIT 1;
  SELECT id, invoice_number INTO inv_id, inv_num FROM invoices LIMIT 1;
  
  IF inv_id IS NOT NULL THEN
    INSERT INTO invoice_returns (
      organization_id, return_number, return_date,
      invoice_id, invoice_number,
      patient_id, patient_name_ar,
      reason_ar, return_amount,
      refund_method, status
    ) VALUES
    (
      COALESCE(org_id, '00000000-0000-0000-0000-000000000000'),
      'RET-2024-00001',
      CURRENT_DATE - INTERVAL '5 days',
      inv_id, inv_num,
      'P-001', 'أحمد محمد',
      'خطأ في الفاتورة - تم احتساب خدمات إضافية',
      50000,
      'CASH', 'REFUNDED'
    );
  END IF;
END $$;
*/

-- =====================================================
-- ROW LEVEL SECURITY (disable for development)
-- =====================================================

ALTER TABLE invoice_returns DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invoice_returns IS 'Invoice return/refund records';
COMMENT ON COLUMN invoice_returns.return_number IS 'Unique return identifier (e.g., RET-2024-00001)';
COMMENT ON COLUMN invoice_returns.invoice_id IS 'Reference to original invoice';
COMMENT ON COLUMN invoice_returns.return_amount IS 'Amount to be refunded';
COMMENT ON COLUMN invoice_returns.status IS 'Return status: PENDING, APPROVED, REJECTED, REFUNDED';

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS (if tables exist)
-- =====================================================

DO $$
BEGIN
  -- Add foreign key to organizations if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    EXECUTE 'ALTER TABLE invoice_returns ADD CONSTRAINT fk_invoice_returns_org FOREIGN KEY (organization_id) REFERENCES organizations(id)';
  END IF;
  
  -- Add foreign key to invoices if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    EXECUTE 'ALTER TABLE invoice_returns ADD CONSTRAINT fk_invoice_returns_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Silently ignore foreign key constraint errors
    NULL;
END $$;

-- =====================================================
-- VERIFICATION QUERY (commented out to avoid errors on empty table)
-- =====================================================

-- Uncomment to verify data after migration:
-- SELECT 
--   return_number,
--   return_date,
--   invoice_number,
--   patient_name_ar,
--   return_amount,
--   status
-- FROM invoice_returns 
-- ORDER BY return_date DESC;
