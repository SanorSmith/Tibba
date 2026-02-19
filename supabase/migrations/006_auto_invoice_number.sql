-- =====================================================
-- AUTO-GENERATE INVOICE NUMBERS
-- =====================================================

-- Create a sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Function to generate invoice number in format: INV-YYYY-XXXXX
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get the next sequence number for this year
  -- Reset sequence at the start of each year
  SELECT COALESCE(MAX(CAST(SUBSTRING(i.invoice_number FROM 10) AS INTEGER)), 0) + 1
  INTO next_number
  FROM invoices i
  WHERE i.invoice_number LIKE 'INV-' || current_year || '-%';
  
  -- If no invoices exist for this year, start from 1
  IF next_number IS NULL THEN
    next_number := 1;
  END IF;
  
  -- Format: INV-YYYY-XXXXX (5 digits, zero-padded)
  new_invoice_number := 'INV-' || current_year || '-' || LPAD(next_number::TEXT, 5, '0');
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-generate invoice number before insert
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if invoice_number is NULL or empty
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoices table
DROP TRIGGER IF EXISTS trigger_set_invoice_number ON invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION generate_invoice_number() IS 'Generates invoice number in format INV-YYYY-XXXXX';
COMMENT ON FUNCTION set_invoice_number() IS 'Trigger function to auto-generate invoice number on insert';

-- =====================================================
-- TEST THE FUNCTION
-- =====================================================

-- Test: Generate a sample invoice number
SELECT generate_invoice_number() AS sample_invoice_number;
