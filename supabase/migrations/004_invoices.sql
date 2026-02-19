-- =====================================================
-- MEDICAL INVOICES TABLE WITH FULL CRUD SUPPORT
-- =====================================================

-- Drop existing table to ensure clean recreation
DROP TABLE IF EXISTS invoice_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;

-- Create invoices table
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Invoice Information
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  
  -- Patient Information
  patient_id VARCHAR(50),
  patient_name VARCHAR(255),
  patient_name_ar VARCHAR(255),
  
  -- Financial Details
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  tax_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Insurance Information
  insurance_company_id UUID REFERENCES insurance_companies(id),
  insurance_coverage_amount DECIMAL(15,2) DEFAULT 0,
  insurance_coverage_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Payment Details
  patient_responsibility DECIMAL(15,2) DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) DEFAULT 0,
  
  -- Status & Payment
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, PARTIALLY_PAID, UNPAID, CANCELLED, REFUNDED
  payment_method VARCHAR(50), -- CASH, CARD, BANK_TRANSFER, INSURANCE, CHECK
  payment_date DATE,
  payment_reference VARCHAR(100),
  
  -- Additional Information
  responsible_entity_type VARCHAR(50), -- PATIENT, INSURANCE, GOVERNMENT, COMPANY
  responsible_entity_id VARCHAR(50),
  notes TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID,
  
  -- Soft Delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID
);

-- Create invoice items table
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  
  -- Item Information
  item_type VARCHAR(50) NOT NULL, -- SERVICE, MEDICATION, PROCEDURE, CONSULTATION, LAB_TEST, RADIOLOGY, SURGERY
  item_code VARCHAR(50),
  item_name VARCHAR(255) NOT NULL,
  item_name_ar VARCHAR(255),
  description TEXT,
  
  -- Pricing
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL,
  
  -- Insurance Coverage
  insurance_covered BOOLEAN DEFAULT false,
  insurance_coverage_percentage DECIMAL(5,2) DEFAULT 0,
  insurance_amount DECIMAL(15,2) DEFAULT 0,
  patient_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_insurance ON invoices(insurance_company_id);
CREATE INDEX idx_invoices_deleted ON invoices(is_deleted);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_type ON invoice_items(item_type);

-- =====================================================
-- DEMO DATA - Sample Invoices
-- =====================================================

DO $$
DECLARE
  org_id UUID := '00000000-0000-0000-0000-000000000000';
  ins_001 UUID;
  ins_003 UUID;
  inv_001 UUID;
  inv_002 UUID;
  inv_003 UUID;
  inv_004 UUID;
  inv_005 UUID;
BEGIN
  -- Try to get organization ID
  SELECT id INTO org_id FROM organizations LIMIT 1;
  IF org_id IS NULL THEN
    org_id := '00000000-0000-0000-0000-000000000000';
  END IF;
  
  -- Get insurance company IDs
  SELECT id INTO ins_001 FROM insurance_companies WHERE company_code = 'INS-001' LIMIT 1;
  SELECT id INTO ins_003 FROM insurance_companies WHERE company_code = 'INS-003' LIMIT 1;
  
  -- Invoice 1: Paid with Insurance
  INSERT INTO invoices (
    organization_id, invoice_number, invoice_date, patient_id, patient_name, patient_name_ar,
    subtotal, discount_percentage, discount_amount, total_amount,
    insurance_company_id, insurance_coverage_amount, insurance_coverage_percentage,
    patient_responsibility, amount_paid, balance_due,
    status, payment_method, payment_date, notes
  ) VALUES (
    org_id, 'INV-2024-00001', '2024-01-15', 'fp-001', 'Ahmed Mohammed', 'أحمد محمد',
    3125000, 0, 0, 3125000,
    ins_003, 2500000, 80,
    625000, 625000, 0,
    'PAID', 'CASH', '2024-01-15', 'عملية زائدة دودية + استشارة'
  ) RETURNING id INTO inv_001;
  
  -- Invoice 1 Items
  INSERT INTO invoice_items (invoice_id, item_type, item_code, item_name, item_name_ar, quantity, unit_price, subtotal, insurance_covered, insurance_coverage_percentage, insurance_amount, patient_amount)
  VALUES
    (inv_001, 'SURGERY', 'SRG-001', 'Appendectomy', 'عملية استئصال الزائدة الدودية', 1, 3000000, 3000000, true, 80, 2400000, 600000),
    (inv_001, 'CONSULTATION', 'CONS-001', 'Surgical Consultation', 'استشارة جراحية', 1, 125000, 125000, true, 80, 100000, 25000);
  
  -- Invoice 2: Paid by Insurance (100% coverage)
  INSERT INTO invoices (
    organization_id, invoice_number, invoice_date, patient_id, patient_name, patient_name_ar,
    subtotal, total_amount,
    insurance_company_id, insurance_coverage_amount, insurance_coverage_percentage,
    patient_responsibility, amount_paid, balance_due,
    status, payment_method, payment_date, responsible_entity_type, responsible_entity_id, notes
  ) VALUES (
    org_id, 'INV-2024-00002', '2024-01-20', 'fp-002', 'Fatima Ali', 'فاطمة علي',
    135000, 135000,
    ins_001, 135000, 100,
    0, 0, 0,
    'PAID', 'INSURANCE', '2024-01-20', 'INSURANCE', 'ins-001', 'فحوصات مختبرية'
  ) RETURNING id INTO inv_002;
  
  -- Invoice 2 Items
  INSERT INTO invoice_items (invoice_id, item_type, item_code, item_name, item_name_ar, quantity, unit_price, subtotal, insurance_covered, insurance_coverage_percentage, insurance_amount, patient_amount)
  VALUES
    (inv_002, 'LAB_TEST', 'LAB-001', 'Complete Blood Count', 'تحليل صورة دم كاملة', 1, 50000, 50000, true, 100, 50000, 0),
    (inv_002, 'LAB_TEST', 'LAB-002', 'Blood Sugar Test', 'تحليل سكر الدم', 1, 35000, 35000, true, 100, 35000, 0),
    (inv_002, 'LAB_TEST', 'LAB-003', 'Lipid Profile', 'تحليل الدهون', 1, 50000, 50000, true, 100, 50000, 0);
  
  -- Invoice 3: Partially Paid
  INSERT INTO invoices (
    organization_id, invoice_number, invoice_date, patient_id, patient_name, patient_name_ar,
    subtotal, total_amount,
    insurance_company_id, insurance_coverage_amount, insurance_coverage_percentage,
    patient_responsibility, amount_paid, balance_due,
    status, payment_method, payment_date, notes
  ) VALUES (
    org_id, 'INV-2024-00003', '2024-02-01', 'fp-003', 'Mohammed Hassan', 'محمد حسن',
    850000, 850000,
    ins_003, 595000, 70,
    255000, 100000, 155000,
    'PARTIALLY_PAID', 'CASH', '2024-02-01', 'أشعة وفحوصات - دفعة جزئية'
  ) RETURNING id INTO inv_003;
  
  -- Invoice 3 Items
  INSERT INTO invoice_items (invoice_id, item_type, item_code, item_name, item_name_ar, quantity, unit_price, subtotal, insurance_covered, insurance_coverage_percentage, insurance_amount, patient_amount)
  VALUES
    (inv_003, 'RADIOLOGY', 'RAD-001', 'X-Ray Chest', 'أشعة صدر', 1, 150000, 150000, true, 70, 105000, 45000),
    (inv_003, 'RADIOLOGY', 'RAD-002', 'CT Scan', 'أشعة مقطعية', 1, 600000, 600000, true, 70, 420000, 180000),
    (inv_003, 'CONSULTATION', 'CONS-002', 'Radiology Consultation', 'استشارة أشعة', 1, 100000, 100000, true, 70, 70000, 30000);
  
  -- Invoice 4: Pending (No Insurance)
  INSERT INTO invoices (
    organization_id, invoice_number, invoice_date, patient_id, patient_name, patient_name_ar,
    subtotal, total_amount,
    patient_responsibility, amount_paid, balance_due,
    status, notes
  ) VALUES (
    org_id, 'INV-2024-00004', '2024-02-10', 'fp-004', 'Sara Ahmed', 'سارة أحمد',
    450000, 450000,
    450000, 0, 450000,
    'PENDING', 'استشارة وأدوية - بدون تأمين'
  ) RETURNING id INTO inv_004;
  
  -- Invoice 4 Items
  INSERT INTO invoice_items (invoice_id, item_type, item_code, item_name, item_name_ar, quantity, unit_price, subtotal, patient_amount)
  VALUES
    (inv_004, 'CONSULTATION', 'CONS-003', 'General Consultation', 'استشارة عامة', 1, 150000, 150000, 150000),
    (inv_004, 'MEDICATION', 'MED-001', 'Antibiotics', 'مضاد حيوي', 2, 75000, 150000, 150000),
    (inv_004, 'MEDICATION', 'MED-002', 'Pain Relief', 'مسكن ألم', 1, 150000, 150000, 150000);
  
  -- Invoice 5: Unpaid (Overdue)
  INSERT INTO invoices (
    organization_id, invoice_number, invoice_date, patient_id, patient_name, patient_name_ar,
    subtotal, total_amount,
    insurance_company_id, insurance_coverage_amount, insurance_coverage_percentage,
    patient_responsibility, amount_paid, balance_due,
    status, notes
  ) VALUES (
    org_id, 'INV-2024-00005', '2024-01-05', 'fp-005', 'Ali Karim', 'علي كريم',
    1200000, 1200000,
    ins_003, 840000, 70,
    360000, 0, 360000,
    'UNPAID', 'عملية جراحية - متأخر في السداد'
  ) RETURNING id INTO inv_005;
  
  -- Invoice 5 Items
  INSERT INTO invoice_items (invoice_id, item_type, item_code, item_name, item_name_ar, quantity, unit_price, subtotal, insurance_covered, insurance_coverage_percentage, insurance_amount, patient_amount)
  VALUES
    (inv_005, 'SURGERY', 'SRG-002', 'Minor Surgery', 'عملية جراحية صغيرة', 1, 1000000, 1000000, true, 70, 700000, 300000),
    (inv_005, 'CONSULTATION', 'CONS-004', 'Pre-Surgery Consultation', 'استشارة ما قبل الجراحة', 1, 200000, 200000, true, 70, 140000, 60000);
  
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (disable for development)
-- =====================================================

ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE invoices IS 'Medical invoices with insurance and payment tracking';
COMMENT ON TABLE invoice_items IS 'Line items for each invoice';
COMMENT ON COLUMN invoices.status IS 'Invoice status: PENDING, PAID, PARTIALLY_PAID, UNPAID, CANCELLED, REFUNDED';
COMMENT ON COLUMN invoices.payment_method IS 'Payment method: CASH, CARD, BANK_TRANSFER, INSURANCE, CHECK';
COMMENT ON COLUMN invoices.insurance_coverage_percentage IS 'Percentage covered by insurance (0-100)';
COMMENT ON COLUMN invoices.patient_responsibility IS 'Amount patient must pay after insurance';
COMMENT ON COLUMN invoice_items.item_type IS 'Type: SERVICE, MEDICATION, PROCEDURE, CONSULTATION, LAB_TEST, RADIOLOGY, SURGERY';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

SELECT 
  invoice_number, 
  invoice_date,
  patient_name_ar,
  total_amount,
  insurance_coverage_amount,
  patient_responsibility,
  amount_paid,
  balance_due,
  status
FROM invoices 
WHERE is_deleted = false
ORDER BY invoice_date DESC;
