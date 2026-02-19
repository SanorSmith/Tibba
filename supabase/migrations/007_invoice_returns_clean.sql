-- =====================================================
-- INVOICE RETURNS TABLE - CLEAN VERSION
-- =====================================================

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS invoice_returns CASCADE;

-- Create invoice_returns table
CREATE TABLE invoice_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Return Information
  return_number VARCHAR(50) UNIQUE NOT NULL,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Original Invoice Reference
  invoice_id UUID,
  invoice_number VARCHAR(50),
  
  -- Patient Information
  patient_id VARCHAR(50),
  patient_name VARCHAR(255),
  patient_name_ar VARCHAR(255),
  
  -- Return Details
  reason_ar TEXT,
  reason_en TEXT,
  return_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Payment Information
  refund_method VARCHAR(50),
  refund_date DATE,
  refund_reference VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'PENDING',
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoice_returns_org ON invoice_returns(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_return_number ON invoice_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_invoice_id ON invoice_returns(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_patient_id ON invoice_returns(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_return_date ON invoice_returns(return_date);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_status ON invoice_returns(status);

-- Function to generate return number
CREATE OR REPLACE FUNCTION generate_return_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_return_number TEXT;
BEGIN
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(r.return_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoice_returns r
  WHERE r.return_number LIKE 'RET-' || current_year || '-%';
  
  IF next_number IS NULL THEN
    next_number := 1;
  END IF;
  
  new_return_number := 'RET-' || current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN new_return_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger function
CREATE OR REPLACE FUNCTION set_return_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.return_number IS NULL OR NEW.return_number = '' THEN
    NEW.return_number := generate_return_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_return_number ON invoice_returns;
CREATE TRIGGER trigger_set_return_number
  BEFORE INSERT ON invoice_returns
  FOR EACH ROW
  EXECUTE FUNCTION set_return_number();

-- Disable RLS
ALTER TABLE invoice_returns DISABLE ROW LEVEL SECURITY;
