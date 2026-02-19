-- =====================================================
-- HOSPITAL BUDGET MANAGEMENT SYSTEM
-- =====================================================

-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS budget_transactions CASCADE;
DROP TABLE IF EXISTS budget_allocations CASCADE;
DROP TABLE IF EXISTS budget_periods CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;

-- =====================================================
-- BUDGET CATEGORIES TABLE
-- =====================================================
CREATE TABLE budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Category Information
  category_code VARCHAR(50) UNIQUE NOT NULL,
  category_name VARCHAR(255) NOT NULL,
  category_name_ar VARCHAR(255),
  description TEXT,
  
  -- Category Type
  category_type VARCHAR(50) NOT NULL, -- REVENUE, EXPENSE, CAPITAL, OPERATIONAL
  parent_category_id UUID REFERENCES budget_categories(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- =====================================================
-- BUDGET PERIODS TABLE
-- =====================================================
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Period Information
  period_code VARCHAR(50) UNIQUE NOT NULL,
  period_name VARCHAR(255) NOT NULL,
  period_name_ar VARCHAR(255),
  fiscal_year INTEGER NOT NULL,
  
  -- Period Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Period Type
  period_type VARCHAR(50) NOT NULL, -- ANNUAL, QUARTERLY, MONTHLY
  quarter INTEGER, -- 1, 2, 3, 4 for quarterly budgets
  month INTEGER, -- 1-12 for monthly budgets
  
  -- Budget Totals
  total_revenue_budget DECIMAL(15,2) DEFAULT 0,
  total_expense_budget DECIMAL(15,2) DEFAULT 0,
  total_capital_budget DECIMAL(15,2) DEFAULT 0,
  total_operational_budget DECIMAL(15,2) DEFAULT 0,
  
  -- Actual Totals
  total_revenue_actual DECIMAL(15,2) DEFAULT 0,
  total_expense_actual DECIMAL(15,2) DEFAULT 0,
  total_capital_actual DECIMAL(15,2) DEFAULT 0,
  total_operational_actual DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, APPROVED, ACTIVE, CLOSED, REVISED
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- =====================================================
-- BUDGET ALLOCATIONS TABLE
-- =====================================================
CREATE TABLE budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Period and Category
  period_id UUID NOT NULL REFERENCES budget_periods(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES budget_categories(id),
  
  -- Allocation Information
  allocation_code VARCHAR(50) UNIQUE NOT NULL,
  
  -- Department/Cost Center
  department VARCHAR(100),
  department_ar VARCHAR(100),
  cost_center VARCHAR(50),
  
  -- Budget Amounts
  allocated_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  revised_amount DECIMAL(15,2), -- For budget revisions
  committed_amount DECIMAL(15,2) DEFAULT 0, -- Purchase orders, commitments
  actual_amount DECIMAL(15,2) DEFAULT 0, -- Actual spending
  available_amount DECIMAL(15,2) DEFAULT 0, -- Allocated - Committed - Actual
  
  -- Variance
  variance_amount DECIMAL(15,2) DEFAULT 0, -- Allocated - Actual
  variance_percentage DECIMAL(5,2) DEFAULT 0,
  
  -- Allocation Details
  justification TEXT,
  notes TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, FROZEN, CLOSED, TRANSFERRED
  
  -- Approval
  approved_by VARCHAR(255),
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  
  UNIQUE(period_id, category_id, department, cost_center)
);

-- =====================================================
-- BUDGET TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE budget_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Transaction Information
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Allocation Reference
  allocation_id UUID NOT NULL REFERENCES budget_allocations(id),
  
  -- Transaction Type
  transaction_type VARCHAR(50) NOT NULL, -- COMMITMENT, EXPENSE, REVENUE, ADJUSTMENT, TRANSFER
  
  -- Amounts
  amount DECIMAL(15,2) NOT NULL,
  
  -- Reference Documents
  reference_type VARCHAR(50), -- PURCHASE_REQUEST, PURCHASE_ORDER, INVOICE, PAYMENT, RECEIPT
  reference_number VARCHAR(50),
  reference_id UUID,
  
  -- Description
  description TEXT,
  description_ar TEXT,
  
  -- Vendor/Payer
  vendor_name VARCHAR(255),
  vendor_id UUID,
  
  -- Status
  status VARCHAR(50) DEFAULT 'POSTED', -- PENDING, POSTED, REVERSED, CANCELLED
  
  -- Reversal
  reversed_by_id UUID REFERENCES budget_transactions(id),
  reversal_reason TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Budget Categories
CREATE INDEX idx_budget_categories_type ON budget_categories(category_type);
CREATE INDEX idx_budget_categories_active ON budget_categories(is_active);
CREATE INDEX idx_budget_categories_parent ON budget_categories(parent_category_id);

-- Budget Periods
CREATE INDEX idx_budget_periods_fiscal_year ON budget_periods(fiscal_year);
CREATE INDEX idx_budget_periods_status ON budget_periods(status);
CREATE INDEX idx_budget_periods_dates ON budget_periods(start_date, end_date);
CREATE INDEX idx_budget_periods_type ON budget_periods(period_type);

-- Budget Allocations
CREATE INDEX idx_budget_allocations_period ON budget_allocations(period_id);
CREATE INDEX idx_budget_allocations_category ON budget_allocations(category_id);
CREATE INDEX idx_budget_allocations_department ON budget_allocations(department);
CREATE INDEX idx_budget_allocations_status ON budget_allocations(status);

-- Budget Transactions
CREATE INDEX idx_budget_transactions_allocation ON budget_transactions(allocation_id);
CREATE INDEX idx_budget_transactions_date ON budget_transactions(transaction_date);
CREATE INDEX idx_budget_transactions_type ON budget_transactions(transaction_type);
CREATE INDEX idx_budget_transactions_reference ON budget_transactions(reference_type, reference_number);
CREATE INDEX idx_budget_transactions_status ON budget_transactions(status);

-- =====================================================
-- TRIGGERS FOR AUTO-GENERATING CODES
-- =====================================================

-- Function to generate budget period code
CREATE OR REPLACE FUNCTION generate_budget_period_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.period_code IS NULL OR NEW.period_code = '' THEN
    NEW.period_code := 'BP-' || NEW.fiscal_year || '-' || 
                       LPAD(EXTRACT(MONTH FROM NEW.start_date)::TEXT, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_budget_period_code
  BEFORE INSERT ON budget_periods
  FOR EACH ROW
  EXECUTE FUNCTION generate_budget_period_code();

-- Function to generate allocation code
CREATE OR REPLACE FUNCTION generate_allocation_code()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.allocation_code IS NULL OR NEW.allocation_code = '' THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(allocation_code FROM 'BA-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM budget_allocations;
    
    NEW.allocation_code := 'BA-' || LPAD(next_num::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_allocation_code
  BEFORE INSERT ON budget_allocations
  FOR EACH ROW
  EXECUTE FUNCTION generate_allocation_code();

-- Function to generate transaction number
CREATE OR REPLACE FUNCTION generate_budget_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
  year_part VARCHAR(4);
BEGIN
  IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
    year_part := EXTRACT(YEAR FROM NEW.transaction_date)::TEXT;
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM 'BT-' || year_part || '-(\d+)') AS INTEGER)), 0) + 1
    INTO next_num
    FROM budget_transactions
    WHERE transaction_number LIKE 'BT-' || year_part || '-%';
    
    NEW.transaction_number := 'BT-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_budget_transaction_number
  BEFORE INSERT ON budget_transactions
  FOR EACH ROW
  EXECUTE FUNCTION generate_budget_transaction_number();

-- =====================================================
-- DEMO DATA - BUDGET CATEGORIES
-- =====================================================

INSERT INTO budget_categories (category_code, category_name, category_name_ar, category_type, description) VALUES
-- Revenue Categories
('REV-001', 'Patient Services Revenue', 'إيرادات خدمات المرضى', 'REVENUE', 'Revenue from patient care services'),
('REV-002', 'Outpatient Services', 'خدمات العيادات الخارجية', 'REVENUE', 'Revenue from outpatient consultations'),
('REV-003', 'Inpatient Services', 'خدمات المرضى الداخليين', 'REVENUE', 'Revenue from inpatient admissions'),
('REV-004', 'Emergency Services', 'خدمات الطوارئ', 'REVENUE', 'Revenue from emergency department'),
('REV-005', 'Laboratory Services', 'خدمات المختبر', 'REVENUE', 'Revenue from lab tests'),
('REV-006', 'Radiology Services', 'خدمات الأشعة', 'REVENUE', 'Revenue from imaging services'),
('REV-007', 'Pharmacy Sales', 'مبيعات الصيدلية', 'REVENUE', 'Revenue from pharmacy'),
('REV-008', 'Surgical Services', 'خدمات الجراحة', 'REVENUE', 'Revenue from surgical procedures'),

-- Operational Expense Categories
('EXP-001', 'Salaries and Wages', 'الرواتب والأجور', 'OPERATIONAL', 'Employee salaries and wages'),
('EXP-002', 'Medical Supplies', 'المستلزمات الطبية', 'OPERATIONAL', 'Medical consumables and supplies'),
('EXP-003', 'Pharmaceutical Supplies', 'المستلزمات الصيدلانية', 'OPERATIONAL', 'Medications and drugs'),
('EXP-004', 'Utilities', 'المرافق', 'OPERATIONAL', 'Electricity, water, gas'),
('EXP-005', 'Maintenance and Repairs', 'الصيانة والإصلاحات', 'OPERATIONAL', 'Building and equipment maintenance'),
('EXP-006', 'Professional Services', 'الخدمات المهنية', 'OPERATIONAL', 'Consulting and professional fees'),
('EXP-007', 'Insurance', 'التأمين', 'OPERATIONAL', 'Insurance premiums'),
('EXP-008', 'Administrative Expenses', 'المصاريف الإدارية', 'OPERATIONAL', 'Office supplies and admin costs'),
('EXP-009', 'Training and Development', 'التدريب والتطوير', 'OPERATIONAL', 'Staff training programs'),
('EXP-010', 'Cleaning and Sanitation', 'النظافة والتعقيم', 'OPERATIONAL', 'Cleaning services and supplies'),

-- Capital Expense Categories
('CAP-001', 'Medical Equipment', 'المعدات الطبية', 'CAPITAL', 'Purchase of medical equipment'),
('CAP-002', 'IT Infrastructure', 'البنية التحتية لتقنية المعلومات', 'CAPITAL', 'Computer systems and software'),
('CAP-003', 'Building Improvements', 'تحسينات المباني', 'CAPITAL', 'Facility renovations and upgrades'),
('CAP-004', 'Vehicles', 'المركبات', 'CAPITAL', 'Ambulances and vehicles'),
('CAP-005', 'Furniture and Fixtures', 'الأثاث والتجهيزات', 'CAPITAL', 'Office and medical furniture');

-- =====================================================
-- DEMO DATA - BUDGET PERIODS
-- =====================================================

INSERT INTO budget_periods (
  period_code, period_name, period_name_ar, fiscal_year, 
  start_date, end_date, period_type, status,
  total_revenue_budget, total_expense_budget, total_capital_budget, total_operational_budget,
  approved_by, approved_at, created_by
) VALUES
-- 2024 Annual Budget
('BP-2024-01', '2024 Annual Budget', 'ميزانية 2024 السنوية', 2024, 
 '2024-01-01', '2024-12-31', 'ANNUAL', 'CLOSED',
 15000000000, 12000000000, 2000000000, 10000000000,
 'Dr. Ahmed Al-Maliki', '2023-12-15 10:00:00+00', 'Finance Director'),

-- 2025 Annual Budget (Active)
('BP-2025-01', '2025 Annual Budget', 'ميزانية 2025 السنوية', 2025, 
 '2025-01-01', '2025-12-31', 'ANNUAL', 'ACTIVE',
 18000000000, 14500000000, 2500000000, 12000000000,
 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),

-- 2025 Q1
('BP-2025-Q1', '2025 Q1 Budget', 'ميزانية الربع الأول 2025', 2025, 
 '2025-01-01', '2025-03-31', 'QUARTERLY', 'CLOSED',
 4500000000, 3625000000, 625000000, 3000000000,
 'Dr. Ahmed Al-Maliki', '2024-12-20 10:00:00+00', 'Finance Director'),

-- 2025 Q2 (Current)
('BP-2025-Q2', '2025 Q2 Budget', 'ميزانية الربع الثاني 2025', 2025, 
 '2025-04-01', '2025-06-30', 'QUARTERLY', 'APPROVED',
 4500000000, 3625000000, 625000000, 3000000000,
 'Dr. Ahmed Al-Maliki', '2025-03-25 10:00:00+00', 'Finance Director'),

-- Monthly Budgets for 2025
('BP-2025-M01', 'January 2025', 'يناير 2025', 2025, '2025-01-01', '2025-01-31', 'MONTHLY', 'CLOSED',
 1500000000, 1208333333, 208333333, 1000000000, 'Dr. Ahmed Al-Maliki', '2024-12-28 10:00:00+00', 'Finance Director'),
 
('BP-2025-M02', 'February 2025', 'فبراير 2025', 2025, '2025-02-01', '2025-02-28', 'MONTHLY', 'CLOSED',
 1500000000, 1208333333, 208333333, 1000000000, 'Dr. Ahmed Al-Maliki', '2025-01-28 10:00:00+00', 'Finance Director'),
 
('BP-2025-M03', 'March 2025', 'مارس 2025', 2025, '2025-03-01', '2025-03-31', 'MONTHLY', 'CLOSED',
 1500000000, 1208333333, 208333333, 1000000000, 'Dr. Ahmed Al-Maliki', '2025-02-25 10:00:00+00', 'Finance Director'),
 
('BP-2025-M04', 'April 2025', 'أبريل 2025', 2025, '2025-04-01', '2025-04-30', 'MONTHLY', 'ACTIVE',
 1500000000, 1208333333, 208333333, 1000000000, 'Dr. Ahmed Al-Maliki', '2025-03-28 10:00:00+00', 'Finance Director');

-- =====================================================
-- DEMO DATA - BUDGET ALLOCATIONS (2025 Annual)
-- =====================================================

-- Get the 2025 Annual Budget period ID
DO $$
DECLARE
  period_2025 UUID;
  cat_salaries UUID;
  cat_medical_supplies UUID;
  cat_pharma UUID;
  cat_utilities UUID;
  cat_maintenance UUID;
  cat_medical_equip UUID;
  cat_it_infra UUID;
  cat_patient_revenue UUID;
  cat_outpatient UUID;
  cat_emergency UUID;
BEGIN
  SELECT id INTO period_2025 FROM budget_periods WHERE period_code = 'BP-2025-01';
  SELECT id INTO cat_salaries FROM budget_categories WHERE category_code = 'EXP-001';
  SELECT id INTO cat_medical_supplies FROM budget_categories WHERE category_code = 'EXP-002';
  SELECT id INTO cat_pharma FROM budget_categories WHERE category_code = 'EXP-003';
  SELECT id INTO cat_utilities FROM budget_categories WHERE category_code = 'EXP-004';
  SELECT id INTO cat_maintenance FROM budget_categories WHERE category_code = 'EXP-005';
  SELECT id INTO cat_medical_equip FROM budget_categories WHERE category_code = 'CAP-001';
  SELECT id INTO cat_it_infra FROM budget_categories WHERE category_code = 'CAP-002';
  SELECT id INTO cat_patient_revenue FROM budget_categories WHERE category_code = 'REV-001';
  SELECT id INTO cat_outpatient FROM budget_categories WHERE category_code = 'REV-002';
  SELECT id INTO cat_emergency FROM budget_categories WHERE category_code = 'REV-004';

  -- Revenue Allocations
  INSERT INTO budget_allocations (
    period_id, category_id, allocation_code, department, department_ar,
    allocated_amount, actual_amount, available_amount, variance_amount, variance_percentage,
    status, approved_by, approved_at, created_by
  ) VALUES
  (period_2025, cat_patient_revenue, 'BA-000001', 'Inpatient Services', 'خدمات المرضى الداخليين',
   8000000000, 2100000000, 5900000000, -2100000000, -26.25, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_outpatient, 'BA-000002', 'Outpatient Clinics', 'العيادات الخارجية',
   5000000000, 1350000000, 3650000000, -1350000000, -27.00, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_emergency, 'BA-000003', 'Emergency Department', 'قسم الطوارئ',
   3000000000, 820000000, 2180000000, -820000000, -27.33, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director');

  -- Operational Expense Allocations
  INSERT INTO budget_allocations (
    period_id, category_id, allocation_code, department, department_ar, cost_center,
    allocated_amount, committed_amount, actual_amount, available_amount, variance_amount, variance_percentage,
    status, approved_by, approved_at, created_by
  ) VALUES
  -- Salaries by Department
  (period_2025, cat_salaries, 'BA-000004', 'Medical Staff', 'الطاقم الطبي', 'CC-MED',
   4000000000, 0, 1050000000, 2950000000, 2950000000, 73.75, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_salaries, 'BA-000005', 'Nursing Staff', 'طاقم التمريض', 'CC-NUR',
   2500000000, 0, 670000000, 1830000000, 1830000000, 73.20, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_salaries, 'BA-000006', 'Administrative Staff', 'الطاقم الإداري', 'CC-ADM',
   1200000000, 0, 315000000, 885000000, 885000000, 73.75, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_salaries, 'BA-000007', 'Support Staff', 'طاقم الدعم', 'CC-SUP',
   800000000, 0, 210000000, 590000000, 590000000, 73.75, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
  
  -- Medical Supplies by Department
  (period_2025, cat_medical_supplies, 'BA-000008', 'Surgery Department', 'قسم الجراحة', 'CC-SUR',
   800000000, 125000000, 185000000, 490000000, 615000000, 76.88, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_medical_supplies, 'BA-000009', 'Emergency Department', 'قسم الطوارئ', 'CC-EMR',
   600000000, 95000000, 142000000, 363000000, 458000000, 76.33, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_medical_supplies, 'BA-000010', 'ICU', 'العناية المركزة', 'CC-ICU',
   700000000, 110000000, 168000000, 422000000, 532000000, 76.00, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_medical_supplies, 'BA-000011', 'Outpatient Clinics', 'العيادات الخارجية', 'CC-OPD',
   400000000, 62000000, 95000000, 243000000, 305000000, 76.25, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
  
  -- Pharmaceutical Supplies
  (period_2025, cat_pharma, 'BA-000012', 'Inpatient Pharmacy', 'صيدلية المرضى الداخليين', 'CC-IPP',
   1500000000, 235000000, 358000000, 907000000, 1142000000, 76.13, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_pharma, 'BA-000013', 'Outpatient Pharmacy', 'صيدلية العيادات الخارجية', 'CC-OPP',
   800000000, 125000000, 192000000, 483000000, 608000000, 76.00, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
  
  -- Utilities
  (period_2025, cat_utilities, 'BA-000014', 'Facility Management', 'إدارة المرافق', 'CC-FAC',
   900000000, 0, 235000000, 665000000, 665000000, 73.89, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
  
  -- Maintenance
  (period_2025, cat_maintenance, 'BA-000015', 'Biomedical Engineering', 'الهندسة الطبية الحيوية', 'CC-BME',
   600000000, 85000000, 142000000, 373000000, 458000000, 76.33, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_maintenance, 'BA-000016', 'Facility Maintenance', 'صيانة المرافق', 'CC-FMT',
   400000000, 58000000, 95000000, 247000000, 305000000, 76.25, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director');

  -- Capital Expense Allocations
  INSERT INTO budget_allocations (
    period_id, category_id, allocation_code, department, department_ar, cost_center,
    allocated_amount, committed_amount, actual_amount, available_amount, variance_amount, variance_percentage,
    status, approved_by, approved_at, created_by
  ) VALUES
  (period_2025, cat_medical_equip, 'BA-000017', 'Radiology Department', 'قسم الأشعة', 'CC-RAD',
   1200000000, 850000000, 0, 350000000, 1200000000, 100.00, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_medical_equip, 'BA-000018', 'Laboratory', 'المختبر', 'CC-LAB',
   600000000, 0, 145000000, 455000000, 455000000, 75.83, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director'),
   
  (period_2025, cat_it_infra, 'BA-000019', 'IT Department', 'قسم تقنية المعلومات', 'CC-IT',
   500000000, 285000000, 0, 215000000, 500000000, 100.00, 'ACTIVE', 'Dr. Ahmed Al-Maliki', '2024-12-10 10:00:00+00', 'Finance Director');

END $$;

-- =====================================================
-- DEMO DATA - BUDGET TRANSACTIONS
-- =====================================================

-- Sample transactions for medical supplies
INSERT INTO budget_transactions (
  transaction_number, transaction_date, allocation_id, transaction_type,
  amount, reference_type, reference_number, description, description_ar,
  vendor_name, status, created_by
)
SELECT 
  'BT-2025-' || LPAD((ROW_NUMBER() OVER())::TEXT, 5, '0'),
  '2025-01-15'::DATE + (ROW_NUMBER() OVER() * INTERVAL '3 days'),
  ba.id,
  'EXPENSE',
  CASE 
    WHEN ROW_NUMBER() OVER() % 3 = 0 THEN 15000000
    WHEN ROW_NUMBER() OVER() % 3 = 1 THEN 25000000
    ELSE 35000000
  END,
  'INVOICE',
  'INV-2025-' || LPAD((ROW_NUMBER() OVER())::TEXT, 5, '0'),
  'Medical supplies purchase',
  'شراء مستلزمات طبية',
  CASE 
    WHEN ROW_NUMBER() OVER() % 4 = 0 THEN 'Al-Shifa Medical Supplies'
    WHEN ROW_NUMBER() OVER() % 4 = 1 THEN 'Baghdad Medical Co.'
    WHEN ROW_NUMBER() OVER() % 4 = 2 THEN 'Mesopotamia Healthcare'
    ELSE 'Tigris Medical Equipment'
  END,
  'POSTED',
  'Finance Officer'
FROM budget_allocations ba
WHERE ba.allocation_code IN ('BA-000008', 'BA-000009', 'BA-000010', 'BA-000011')
LIMIT 20;

-- Sample commitment transactions for capital equipment
INSERT INTO budget_transactions (
  transaction_number, transaction_date, allocation_id, transaction_type,
  amount, reference_type, reference_number, description, description_ar,
  vendor_name, status, created_by
)
SELECT 
  'BT-2025-' || LPAD((20 + ROW_NUMBER() OVER())::TEXT, 5, '0'),
  CURRENT_DATE - INTERVAL '15 days',
  ba.id,
  'COMMITMENT',
  CASE 
    WHEN ba.allocation_code = 'BA-000017' THEN 850000000
    WHEN ba.allocation_code = 'BA-000019' THEN 285000000
    ELSE 0
  END,
  'PURCHASE_ORDER',
  'PO-2025-' || LPAD((ROW_NUMBER() OVER())::TEXT, 5, '0'),
  'Equipment purchase order',
  'أمر شراء معدات',
  CASE 
    WHEN ba.allocation_code = 'BA-000017' THEN 'Siemens Medical Solutions'
    WHEN ba.allocation_code = 'BA-000019' THEN 'Dell Technologies Iraq'
    ELSE 'General Supplier'
  END,
  'POSTED',
  'Procurement Manager'
FROM budget_allocations ba
WHERE ba.allocation_code IN ('BA-000017', 'BA-000019');

COMMIT;
