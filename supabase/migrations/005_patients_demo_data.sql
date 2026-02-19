-- =====================================================
-- PATIENTS TABLE WITH DEMO DATA
-- =====================================================

-- Drop existing table to ensure clean recreation
DROP TABLE IF EXISTS patients CASCADE;

-- Create patients table
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  
  -- Patient Identification
  patient_id VARCHAR(50) UNIQUE NOT NULL,
  
  -- Personal Information
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  first_name_ar VARCHAR(100),
  last_name_ar VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20), -- MALE, FEMALE, OTHER
  
  -- Contact Information
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  country VARCHAR(100) DEFAULT 'Iraq',
  postal_code VARCHAR(20),
  
  -- Insurance Information
  insurance_provider_id UUID REFERENCES insurance_companies(id),
  insurance_policy_number VARCHAR(100),
  insurance_status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, SUSPENDED
  
  -- Emergency Contact
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),
  
  -- Medical Information
  blood_type VARCHAR(10),
  allergies TEXT,
  chronic_conditions TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID
);

-- Create indexes for performance
CREATE INDEX idx_patients_org ON patients(organization_id);
CREATE INDEX idx_patients_patient_id ON patients(patient_id);
CREATE INDEX idx_patients_first_name ON patients(first_name);
CREATE INDEX idx_patients_last_name ON patients(last_name);
CREATE INDEX idx_patients_first_name_ar ON patients(first_name_ar);
CREATE INDEX idx_patients_last_name_ar ON patients(last_name_ar);
CREATE INDEX idx_patients_phone ON patients(phone);
CREATE INDEX idx_patients_insurance ON patients(insurance_provider_id);

-- =====================================================
-- DEMO DATA - Iraqi Patients
-- =====================================================

DO $$
DECLARE
  org_id UUID := '00000000-0000-0000-0000-000000000000';
  ins_001 UUID;
  ins_002 UUID;
  ins_003 UUID;
BEGIN
  -- Try to get organization ID
  SELECT id INTO org_id FROM organizations LIMIT 1;
  IF org_id IS NULL THEN
    org_id := '00000000-0000-0000-0000-000000000000';
  END IF;
  
  -- Get insurance company IDs
  SELECT id INTO ins_001 FROM insurance_companies WHERE company_code = 'INS-001' LIMIT 1;
  SELECT id INTO ins_002 FROM insurance_companies WHERE company_code = 'INS-002' LIMIT 1;
  SELECT id INTO ins_003 FROM insurance_companies WHERE company_code = 'INS-003' LIMIT 1;
  
  -- Insert demo patients
  INSERT INTO patients (
    organization_id, patient_id, first_name, last_name, first_name_ar, last_name_ar,
    date_of_birth, gender, phone, email, address, city, province, country,
    insurance_provider_id, insurance_policy_number, insurance_status,
    emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
    blood_type, is_active
  ) VALUES
  -- Patient 1: Ahmed Mohammed (أحمد محمد)
  (
    org_id, 'P-001', 'Ahmed', 'Mohammed', 'أحمد', 'محمد',
    '1985-03-15', 'MALE', '+964 770 123 4567', 'ahmed.mohammed@email.com',
    'Al-Mansour District, Street 14, House 25', 'Baghdad', 'Baghdad', 'Iraq',
    ins_003, 'POL-2024-001', 'ACTIVE',
    'Fatima Mohammed', '+964 771 234 5678', 'Wife',
    'O+', true
  ),
  
  -- Patient 2: Fatima Ali (فاطمة علي)
  (
    org_id, 'P-002', 'Fatima', 'Ali', 'فاطمة', 'علي',
    '1990-07-22', 'FEMALE', '+964 771 234 5678', 'fatima.ali@email.com',
    'Karrada District, Street 52, Building 10', 'Baghdad', 'Baghdad', 'Iraq',
    ins_001, 'POL-2024-002', 'ACTIVE',
    'Ali Hassan', '+964 772 345 6789', 'Husband',
    'A+', true
  ),
  
  -- Patient 3: Mohammed Hassan (محمد حسن)
  (
    org_id, 'P-003', 'Mohammed', 'Hassan', 'محمد', 'حسن',
    '1978-11-10', 'MALE', '+964 772 345 6789', 'mohammed.hassan@email.com',
    'Al-Jadiriya, Street 7, House 15', 'Baghdad', 'Baghdad', 'Iraq',
    ins_003, 'POL-2024-003', 'ACTIVE',
    'Zahra Hassan', '+964 773 456 7890', 'Wife',
    'B+', true
  ),
  
  -- Patient 4: Sara Ahmed (سارة أحمد)
  (
    org_id, 'P-004', 'Sara', 'Ahmed', 'سارة', 'أحمد',
    '1995-05-18', 'FEMALE', '+964 773 456 7890', 'sara.ahmed@email.com',
    'Hay Al-Jamia, Street 3, Building 8', 'Baghdad', 'Baghdad', 'Iraq',
    NULL, NULL, NULL,
    'Ahmed Ali', '+964 774 567 8901', 'Father',
    'AB+', true
  ),
  
  -- Patient 5: Ali Karim (علي كريم)
  (
    org_id, 'P-005', 'Ali', 'Karim', 'علي', 'كريم',
    '1982-09-25', 'MALE', '+964 774 567 8901', 'ali.karim@email.com',
    'Saadoun Street, Building 45, Apt 12', 'Baghdad', 'Baghdad', 'Iraq',
    ins_003, 'POL-2024-005', 'ACTIVE',
    'Maryam Karim', '+964 775 678 9012', 'Wife',
    'O-', true
  ),
  
  -- Patient 6: Zahra Hussein (زهراء حسين)
  (
    org_id, 'P-006', 'Zahra', 'Hussein', 'زهراء', 'حسين',
    '1988-12-30', 'FEMALE', '+964 775 678 9012', 'zahra.hussein@email.com',
    'Al-Ashar District, Street 20, House 5', 'Basrah', 'Basrah', 'Iraq',
    ins_002, 'POL-2024-006', 'ACTIVE',
    'Hussein Ali', '+964 776 789 0123', 'Husband',
    'A-', true
  ),
  
  -- Patient 7: Omar Khalil (عمر خليل)
  (
    org_id, 'P-007', 'Omar', 'Khalil', 'عمر', 'خليل',
    '1975-04-08', 'MALE', '+964 776 789 0123', 'omar.khalil@email.com',
    'Al-Andalus Square, Building 30', 'Baghdad', 'Baghdad', 'Iraq',
    ins_001, 'POL-2024-007', 'ACTIVE',
    'Layla Khalil', '+964 777 890 1234', 'Wife',
    'B-', true
  ),
  
  -- Patient 8: Layla Ibrahim (ليلى إبراهيم)
  (
    org_id, 'P-008', 'Layla', 'Ibrahim', 'ليلى', 'إبراهيم',
    '1992-08-14', 'FEMALE', '+964 777 890 1234', 'layla.ibrahim@email.com',
    'Hay Al-Adel, Street 12, House 18', 'Baghdad', 'Baghdad', 'Iraq',
    NULL, NULL, NULL,
    'Ibrahim Youssef', '+964 778 901 2345', 'Father',
    'O+', true
  ),
  
  -- Patient 9: Hassan Mahmoud (حسن محمود)
  (
    org_id, 'P-009', 'Hassan', 'Mahmoud', 'حسن', 'محمود',
    '1980-06-20', 'MALE', '+964 778 901 2345', 'hassan.mahmoud@email.com',
    'Al-Kadhimiya, Street 8, Building 22', 'Baghdad', 'Baghdad', 'Iraq',
    ins_003, 'POL-2024-009', 'ACTIVE',
    'Noor Mahmoud', '+964 779 012 3456', 'Wife',
    'AB-', true
  ),
  
  -- Patient 10: Noor Saleh (نور صالح)
  (
    org_id, 'P-010', 'Noor', 'Saleh', 'نور', 'صالح',
    '1998-02-28', 'FEMALE', '+964 779 012 3456', 'noor.saleh@email.com',
    'Al-Dora, Street 15, House 30', 'Baghdad', 'Baghdad', 'Iraq',
    ins_002, 'POL-2024-010', 'ACTIVE',
    'Saleh Ahmed', '+964 770 123 4567', 'Father',
    'A+', true
  ),
  
  -- Patient 11: Youssef Tariq (يوسف طارق)
  (
    org_id, 'P-011', 'Youssef', 'Tariq', 'يوسف', 'طارق',
    '1987-10-05', 'MALE', '+964 771 234 5678', 'youssef.tariq@email.com',
    'Al-Amiriya, Street 25, Building 7', 'Baghdad', 'Baghdad', 'Iraq',
    ins_001, 'POL-2024-011', 'ACTIVE',
    'Huda Tariq', '+964 772 345 6789', 'Wife',
    'B+', true
  ),
  
  -- Patient 12: Huda Rashid (هدى رشيد)
  (
    org_id, 'P-012', 'Huda', 'Rashid', 'هدى', 'رشيد',
    '1993-01-12', 'FEMALE', '+964 772 345 6789', 'huda.rashid@email.com',
    'Hay Al-Jihad, Street 40, House 12', 'Baghdad', 'Baghdad', 'Iraq',
    NULL, NULL, NULL,
    'Rashid Khalil', '+964 773 456 7890', 'Father',
    'O-', true
  );
  
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (disable for development)
-- =====================================================

ALTER TABLE patients DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE patients IS 'Patient records with personal, contact, and insurance information';
COMMENT ON COLUMN patients.patient_id IS 'Unique patient identifier (e.g., P-001)';
COMMENT ON COLUMN patients.insurance_provider_id IS 'Reference to insurance company if patient has insurance';
COMMENT ON COLUMN patients.insurance_status IS 'Insurance status: ACTIVE, EXPIRED, SUSPENDED';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

SELECT 
  patient_id,
  first_name,
  last_name,
  first_name_ar,
  last_name_ar,
  phone,
  CASE 
    WHEN insurance_provider_id IS NOT NULL THEN 'Insured'
    ELSE 'No Insurance'
  END as insurance_status
FROM patients 
ORDER BY patient_id;
