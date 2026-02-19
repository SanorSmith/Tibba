-- =====================================================
-- SHAREHOLDERS TABLE
-- =====================================================

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS shareholders CASCADE;

-- Create shareholders table
CREATE TABLE shareholders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Shareholder Information
  shareholder_id VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  full_name_ar VARCHAR(255),
  
  -- Contact Information
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  address TEXT,
  address_ar TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Iraq',
  
  -- Identification
  national_id VARCHAR(50),
  passport_number VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(100),
  
  -- Shareholding Details
  share_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  number_of_shares INTEGER NOT NULL DEFAULT 0,
  share_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  investment_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  investment_date DATE,
  
  -- Shareholder Type
  shareholder_type VARCHAR(50) DEFAULT 'INDIVIDUAL', -- INDIVIDUAL, CORPORATE, INSTITUTIONAL
  company_name VARCHAR(255), -- If corporate
  company_registration VARCHAR(100), -- If corporate
  
  -- Status
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED
  is_board_member BOOLEAN DEFAULT false,
  board_position VARCHAR(100), -- Chairman, Vice Chairman, Member, etc.
  
  -- Financial Information
  total_dividends_received DECIMAL(15,2) DEFAULT 0,
  last_dividend_date DATE,
  
  -- Documents
  contract_document_url TEXT,
  id_document_url TEXT,
  
  -- Additional Information
  notes TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shareholders_org ON shareholders(organization_id);
CREATE INDEX IF NOT EXISTS idx_shareholders_shareholder_id ON shareholders(shareholder_id);
CREATE INDEX IF NOT EXISTS idx_shareholders_full_name ON shareholders(full_name);
CREATE INDEX IF NOT EXISTS idx_shareholders_email ON shareholders(email);
CREATE INDEX IF NOT EXISTS idx_shareholders_status ON shareholders(status);
CREATE INDEX IF NOT EXISTS idx_shareholders_type ON shareholders(shareholder_type);
CREATE INDEX IF NOT EXISTS idx_shareholders_board_member ON shareholders(is_board_member);

-- Disable RLS for development
ALTER TABLE shareholders DISABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE shareholders IS 'Hospital shareholders and ownership information';
COMMENT ON COLUMN shareholders.shareholder_id IS 'Unique shareholder identifier (e.g., SH-001)';
COMMENT ON COLUMN shareholders.share_percentage IS 'Percentage of total shares owned';
COMMENT ON COLUMN shareholders.number_of_shares IS 'Number of shares owned';
COMMENT ON COLUMN shareholders.shareholder_type IS 'Type: INDIVIDUAL, CORPORATE, INSTITUTIONAL';
COMMENT ON COLUMN shareholders.status IS 'Status: ACTIVE, INACTIVE, SUSPENDED';

-- =====================================================
-- DEMO DATA - Sample Shareholders
-- =====================================================

INSERT INTO shareholders (
  shareholder_id, full_name, full_name_ar,
  email, phone, mobile,
  address, city, country,
  national_id, date_of_birth, nationality,
  share_percentage, number_of_shares, share_value, investment_amount, investment_date,
  shareholder_type, status, is_board_member, board_position,
  total_dividends_received, notes
) VALUES
-- Major Shareholders
(
  'SH-001',
  'Dr. Ahmed Hassan Al-Maliki',
  'د. أحمد حسن المالكي',
  'ahmed.maliki@tibbna.iq',
  '+964-770-123-4567',
  '+964-770-123-4567',
  'Al-Mansour District, Baghdad',
  'Baghdad',
  'Iraq',
  'N123456789',
  '1975-03-15',
  'Iraqi',
  35.00,
  3500,
  10000.00,
  35000000,
  '2020-01-15',
  'INDIVIDUAL',
  'ACTIVE',
  true,
  'Chairman',
  5250000,
  'Founder and majority shareholder, Medical Director'
),
(
  'SH-002',
  'Dr. Fatima Mohammed Al-Zubaidi',
  'د. فاطمة محمد الزبيدي',
  'fatima.zubaidi@tibbna.iq',
  '+964-771-234-5678',
  '+964-771-234-5678',
  'Karrada District, Baghdad',
  'Baghdad',
  'Iraq',
  'N234567890',
  '1980-07-22',
  'Iraqi',
  25.00,
  2500,
  10000.00,
  25000000,
  '2020-01-15',
  'INDIVIDUAL',
  'ACTIVE',
  true,
  'Vice Chairman',
  3750000,
  'Co-founder, Chief Medical Officer'
),
(
  'SH-003',
  'Iraqi Medical Investment Group',
  'مجموعة الاستثمار الطبي العراقي',
  'info@imig.iq',
  '+964-770-345-6789',
  '+964-770-345-6789',
  'International Zone, Baghdad',
  'Baghdad',
  'Iraq',
  NULL,
  NULL,
  'Iraqi',
  20.00,
  2000,
  10000.00,
  20000000,
  '2020-02-01',
  'CORPORATE',
  'ACTIVE',
  true,
  'Board Member',
  3000000,
  'Corporate investor, represented by Mr. Karim Al-Saadi'
),
(
  'SH-004',
  'Dr. Omar Khalil Al-Najjar',
  'د. عمر خليل النجار',
  'omar.najjar@tibbna.iq',
  '+964-772-456-7890',
  '+964-772-456-7890',
  'Jadriya District, Baghdad',
  'Baghdad',
  'Iraq',
  'N345678901',
  '1978-11-10',
  'Iraqi',
  10.00,
  1000,
  10000.00,
  10000000,
  '2020-03-15',
  'INDIVIDUAL',
  'ACTIVE',
  true,
  'Board Member',
  1500000,
  'Specialist in Cardiology, Board Member'
),
(
  'SH-005',
  'Mrs. Zainab Ali Al-Hashimi',
  'السيدة زينب علي الهاشمي',
  'zainab.hashimi@gmail.com',
  '+964-773-567-8901',
  '+964-773-567-8901',
  'Adhamiya District, Baghdad',
  'Baghdad',
  'Iraq',
  'N456789012',
  '1982-05-18',
  'Iraqi',
  5.00,
  500,
  10000.00,
  5000000,
  '2020-06-01',
  'INDIVIDUAL',
  'ACTIVE',
  false,
  NULL,
  750000,
  'Private investor, pharmaceutical business owner'
),
(
  'SH-006',
  'Dr. Hassan Jabbar Al-Amiri',
  'د. حسن جبار العامري',
  'hassan.amiri@tibbna.iq',
  '+964-774-678-9012',
  '+964-774-678-9012',
  'Saydiya District, Baghdad',
  'Baghdad',
  'Iraq',
  'N567890123',
  '1976-09-25',
  'Iraqi',
  3.00,
  300,
  10000.00,
  3000000,
  '2021-01-10',
  'INDIVIDUAL',
  'ACTIVE',
  false,
  NULL,
  450000,
  'Orthopedic surgeon, minority shareholder'
),
(
  'SH-007',
  'Baghdad Healthcare Fund',
  'صندوق بغداد للرعاية الصحية',
  'contact@bhf.iq',
  '+964-770-789-0123',
  '+964-770-789-0123',
  'Waziriya District, Baghdad',
  'Baghdad',
  'Iraq',
  NULL,
  NULL,
  'Iraqi',
  2.00,
  200,
  10000.00,
  2000000,
  '2021-06-15',
  'INSTITUTIONAL',
  'ACTIVE',
  false,
  NULL,
  300000,
  'Healthcare investment fund'
);

-- Verify data
SELECT 
  shareholder_id,
  full_name,
  full_name_ar,
  share_percentage,
  number_of_shares,
  investment_amount,
  shareholder_type,
  status,
  is_board_member,
  board_position
FROM shareholders 
ORDER BY share_percentage DESC;
