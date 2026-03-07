-- =====================================================
-- INVOICE_RETURNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_returns (
  -- Primary Key
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id       UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Return Details
  return_number         VARCHAR(50) UNIQUE NOT NULL,
  return_date           DATE NOT NULL,
  
  -- Related Invoice
  invoice_id            UUID,
  invoice_number        VARCHAR(50),
  
  -- Patient Info
  patient_id            VARCHAR(50),
  patient_name          VARCHAR(255),
  patient_name_ar       TEXT,
   
  -- Return Reason
  reason_ar             TEXT,
  reason_en             TEXT,
  
  -- Financial
  return_amount         DECIMAL(15,2) NOT NULL,
  refund_method         VARCHAR(50),
  refund_date           DATE,
  refund_reference      VARCHAR(100),
  
  -- Status and Approval
  status                VARCHAR(50) DEFAULT 'PENDING',
  approved_by           VARCHAR(255),
  approved_at           TIMESTAMP,
  
  -- Additional
  notes                 TEXT,
  items                 JSONB, -- Store return items as JSON
  
  -- Audit
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by            VARCHAR(255),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by            VARCHAR(255)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_returns_number ON invoice_returns(return_number);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_invoice ON invoice_returns(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_patient ON invoice_returns(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_status ON invoice_returns(status);
CREATE INDEX IF NOT EXISTS idx_invoice_returns_date ON invoice_returns(return_date);

-- Comments
COMMENT ON TABLE invoice_returns IS 'Invoice returns and refunds';
COMMENT ON COLUMN invoice_returns.return_number IS 'Unique return number (e.g., RET-2026-00001)';
COMMENT ON COLUMN invoice_returns.return_amount IS 'Amount to be refunded';
COMMENT ON COLUMN invoice_returns.status IS 'PENDING, APPROVED, REJECTED, PROCESSED';

-- Disable RLS for development
ALTER TABLE invoice_returns DISABLE ROW LEVEL SECURITY;
