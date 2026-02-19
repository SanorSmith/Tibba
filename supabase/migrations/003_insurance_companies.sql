-- =====================================================
-- INSURANCE COMPANIES TABLE WITH PRICING
-- =====================================================

-- Drop existing table if you need to recreate
-- DROP TABLE IF EXISTS insurance_companies CASCADE;

CREATE TABLE IF NOT EXISTS insurance_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Basic Information
  company_code VARCHAR(50) UNIQUE NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  company_name_ar VARCHAR(255),
  
  -- Contact Information
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  
  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  province VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Iraq',
  postal_code VARCHAR(20),
  
  -- Pricing Configuration
  default_discount_percentage DECIMAL(5,2) DEFAULT 0, -- e.g., 15.00 for 15%
  default_copay_percentage DECIMAL(5,2) DEFAULT 0,    -- e.g., 20.00 for 20% patient pays
  claim_payment_terms_days INTEGER DEFAULT 30,         -- Payment within X days
  
  -- Business Terms
  contract_start_date DATE,
  contract_end_date DATE,
  coverage_limit DECIMAL(15,2),                        -- Maximum coverage per patient
  
  -- Status & Metadata
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_insurance_companies_org ON insurance_companies(organization_id);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_code ON insurance_companies(company_code);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_active ON insurance_companies(is_active);
CREATE INDEX IF NOT EXISTS idx_insurance_companies_name ON insurance_companies(company_name);

-- =====================================================
-- DEMO DATA - Iraqi Insurance Companies
-- =====================================================

-- Get organization ID
DO $$
DECLARE
  org_id UUID;
BEGIN
  SELECT id INTO org_id FROM organizations LIMIT 1;
  
  -- Insert demo insurance companies
  INSERT INTO insurance_companies (
    organization_id,
    company_code,
    company_name,
    company_name_ar,
    contact_person,
    phone,
    email,
    website,
    address_line1,
    city,
    province,
    country,
    default_discount_percentage,
    default_copay_percentage,
    claim_payment_terms_days,
    contract_start_date,
    contract_end_date,
    coverage_limit,
    is_active,
    notes
  ) VALUES
  -- Iraqi National Insurance Company
  (
    org_id,
    'INS-001',
    'Iraqi National Insurance Company',
    'شركة التأمين الوطنية العراقية',
    'Ahmed Al-Baghdadi',
    '+964 770 123 4567',
    'claims@nationalinsurance.iq',
    'www.nationalinsurance.iq',
    'Al-Mansour, Baghdad',
    'Baghdad',
    'Baghdad',
    'Iraq',
    20.00, -- 20% discount
    15.00, -- Patient pays 15% copay
    45,    -- Payment in 45 days
    '2024-01-01',
    '2025-12-31',
    50000000.00, -- 50M IQD coverage limit
    true,
    'Primary insurance provider. Government contracts available.'
  ),
  
  -- Al-Ameen Insurance
  (
    org_id,
    'INS-002',
    'Al-Ameen Insurance Company',
    'شركة الأمين للتأمين',
    'Fatima Hassan',
    '+964 771 234 5678',
    'info@alameen-insurance.iq',
    'www.alameen-insurance.iq',
    'Karrada District, Baghdad',
    'Baghdad',
    'Baghdad',
    'Iraq',
    15.00, -- 15% discount
    20.00, -- Patient pays 20% copay
    30,    -- Payment in 30 days
    '2024-01-01',
    '2024-12-31',
    30000000.00, -- 30M IQD coverage limit
    true,
    'Private insurance provider. Popular with corporate clients.'
  ),
  
  -- Gulf Insurance Group
  (
    org_id,
    'INS-003',
    'Gulf Insurance Group Iraq',
    'مجموعة الخليج للتأمين - العراق',
    'Mohammed Al-Basri',
    '+964 772 345 6789',
    'iraq@gig-me.com',
    'www.gig-me.com/iraq',
    'Al-Jadiriya, Baghdad',
    'Baghdad',
    'Baghdad',
    'Iraq',
    25.00, -- 25% discount
    10.00, -- Patient pays 10% copay
    60,    -- Payment in 60 days
    '2023-06-01',
    '2025-05-31',
    100000000.00, -- 100M IQD coverage limit
    true,
    'International insurance provider. Premium plans available.'
  ),
  
  -- Iraqi Life Insurance
  (
    org_id,
    'INS-004',
    'Iraqi Life Insurance Company',
    'شركة الحياة العراقية للتأمين',
    'Sarah Ali',
    '+964 773 456 7890',
    'support@iraqilife.iq',
    'www.iraqilife.iq',
    'Hay Al-Jami''a, Baghdad',
    'Baghdad',
    'Baghdad',
    'Iraq',
    18.00, -- 18% discount
    25.00, -- Patient pays 25% copay
    30,    -- Payment in 30 days
    '2024-03-01',
    '2025-02-28',
    40000000.00, -- 40M IQD coverage limit
    true,
    'Specialized in life and health insurance.'
  ),
  
  -- Al-Warka Insurance
  (
    org_id,
    'INS-005',
    'Al-Warka Insurance Company',
    'شركة الوركاء للتأمين',
    'Omar Khalil',
    '+964 774 567 8901',
    'claims@alwarka-insurance.iq',
    'www.alwarka-insurance.iq',
    'Saadoun Street, Baghdad',
    'Baghdad',
    'Baghdad',
    'Iraq',
    12.00, -- 12% discount
    30.00, -- Patient pays 30% copay
    45,    -- Payment in 45 days
    '2024-01-01',
    '2024-12-31',
    25000000.00, -- 25M IQD coverage limit
    true,
    'Affordable plans for individuals and families.'
  ),
  
  -- Basrah Insurance Co.
  (
    org_id,
    'INS-006',
    'Basrah General Insurance',
    'شركة البصرة العامة للتأمين',
    'Hussein Al-Basri',
    '+964 775 678 9012',
    'info@basrahinsurance.iq',
    'www.basrahinsurance.iq',
    'Al-Ashar District, Basrah',
    'Basrah',
    'Basrah',
    'Iraq',
    10.00, -- 10% discount
    20.00, -- Patient pays 20% copay
    30,    -- Payment in 30 days
    '2023-09-01',
    '2025-08-31',
    35000000.00, -- 35M IQD coverage limit
    true,
    'Regional provider for southern Iraq.'
  ),
  
  -- Government Employee Insurance (Inactive example)
  (
    org_id,
    'INS-007',
    'Government Employee Insurance Fund',
    'صندوق تأمين موظفي الحكومة',
    'Ali Hassan',
    '+964 776 789 0123',
    'geif@gov.iq',
    NULL,
    'Government District, Baghdad',
    'Baghdad',
    'Baghdad',
    'Iraq',
    30.00, -- 30% discount (government rate)
    0.00,  -- No copay for government employees
    90,    -- Payment in 90 days
    '2023-01-01',
    '2023-12-31',
    20000000.00, -- 20M IQD coverage limit
    false, -- Inactive - contract expired
    'Government employee insurance. Contract expired 2023.'
  )
  ON CONFLICT (company_code) DO NOTHING;
  
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (disable for development)
-- =====================================================

ALTER TABLE insurance_companies DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE insurance_companies IS 'Insurance companies and pricing configuration';
COMMENT ON COLUMN insurance_companies.default_discount_percentage IS 'Default discount given to insurance (e.g., 20% off regular price)';
COMMENT ON COLUMN insurance_companies.default_copay_percentage IS 'Percentage patient pays (e.g., 20% means patient pays 20%, insurance pays 80%)';
COMMENT ON COLUMN insurance_companies.claim_payment_terms_days IS 'Number of days within which insurance pays claims';
COMMENT ON COLUMN insurance_companies.coverage_limit IS 'Maximum coverage amount per patient in IQD';
