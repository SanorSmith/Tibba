-- =====================================================
-- PURCHASE REQUESTS TABLE
-- =====================================================

-- Drop existing table if it exists (clean slate)
DROP TABLE IF EXISTS purchase_requests CASCADE;

-- Create purchase_requests table
CREATE TABLE purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID,
  
  -- Request Information
  request_number VARCHAR(50) UNIQUE NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_by VARCHAR(255) NOT NULL,
  requested_by_id UUID,
  department VARCHAR(100),
  
  -- Item Details
  item_name VARCHAR(255) NOT NULL,
  item_name_ar VARCHAR(255),
  item_description TEXT,
  category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit VARCHAR(50),
  estimated_unit_price DECIMAL(15,2),
  estimated_total_price DECIMAL(15,2),
  
  -- Priority and Urgency
  priority VARCHAR(50) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
  required_by_date DATE,
  
  -- Approval Workflow
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, DECLINED, MORE_INFO_NEEDED, PROCESSING, COMPLETED, CANCELLED
  reviewed_by VARCHAR(255),
  reviewed_by_id UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approval_comments TEXT,
  decline_reason TEXT,
  
  -- Supplier Information
  preferred_supplier VARCHAR(255),
  supplier_id UUID,
  
  -- Purchase Order Reference
  po_number VARCHAR(50),
  po_date DATE,
  actual_price DECIMAL(15,2),
  
  -- Additional Information
  justification TEXT,
  notes TEXT,
  attachments_url TEXT,
  
  -- Audit Fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_purchase_requests_org ON purchase_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_number ON purchase_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_priority ON purchase_requests(priority);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_requested_by ON purchase_requests(requested_by_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_reviewed_by ON purchase_requests(reviewed_by_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_date ON purchase_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_department ON purchase_requests(department);

-- Disable RLS for development
ALTER TABLE purchase_requests DISABLE ROW LEVEL SECURITY;

-- Add comments for documentation
COMMENT ON TABLE purchase_requests IS 'Hospital purchase requests and approval workflow';
COMMENT ON COLUMN purchase_requests.request_number IS 'Unique request identifier (e.g., PR-2024-00001)';
COMMENT ON COLUMN purchase_requests.status IS 'Status: PENDING, APPROVED, DECLINED, MORE_INFO_NEEDED, PROCESSING, COMPLETED, CANCELLED';
COMMENT ON COLUMN purchase_requests.priority IS 'Priority: LOW, MEDIUM, HIGH, URGENT';

-- =====================================================
-- AUTO-GENERATE REQUEST NUMBER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_purchase_request_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year TEXT;
  next_sequence INTEGER;
  new_request_number TEXT;
BEGIN
  -- Get current year
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get the next sequence number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(pr.request_number FROM 9) AS INTEGER)), 0) + 1
  INTO next_sequence
  FROM purchase_requests pr
  WHERE pr.request_number LIKE 'PR-' || current_year || '-%';
  
  -- Generate new request number: PR-YYYY-XXXXX
  new_request_number := 'PR-' || current_year || '-' || LPAD(next_sequence::TEXT, 5, '0');
  
  -- Assign to NEW record
  NEW.request_number := new_request_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate request number
DROP TRIGGER IF EXISTS set_purchase_request_number ON purchase_requests;
CREATE TRIGGER set_purchase_request_number
  BEFORE INSERT ON purchase_requests
  FOR EACH ROW
  WHEN (NEW.request_number IS NULL OR NEW.request_number = '')
  EXECUTE FUNCTION generate_purchase_request_number();

-- =====================================================
-- DEMO DATA - 20 Sample Purchase Requests
-- =====================================================

INSERT INTO purchase_requests (
  request_number, request_date, requested_by, department,
  item_name, item_name_ar, item_description, category,
  quantity, unit, estimated_unit_price, estimated_total_price,
  priority, required_by_date, status,
  reviewed_by, reviewed_at, approval_comments, decline_reason,
  preferred_supplier, justification, notes
) VALUES
-- PENDING Requests (5)
(
  'PR-2024-00001',
  '2024-02-15',
  'Dr. Ahmed Hassan',
  'Cardiology',
  'ECG Machine',
  'جهاز تخطيط القلب',
  '12-lead ECG machine with digital display',
  'Medical Equipment',
  2,
  'Unit',
  5000000,
  10000000,
  'HIGH',
  '2024-03-15',
  'PENDING',
  NULL,
  NULL,
  NULL,
  NULL,
  'MedTech Solutions',
  'Current ECG machines are outdated and need replacement',
  'Urgent requirement for cardiology department'
),
(
  'PR-2024-00002',
  '2024-02-16',
  'Nurse Fatima Ali',
  'Emergency',
  'Surgical Gloves',
  'قفازات جراحية',
  'Latex-free surgical gloves, size M',
  'Medical Supplies',
  500,
  'Box',
  25000,
  12500000,
  'URGENT',
  '2024-02-25',
  'PENDING',
  NULL,
  NULL,
  NULL,
  NULL,
  'Medical Supplies Iraq',
  'Running low on stock, critical for ER operations',
  'Need immediate delivery'
),
(
  'PR-2024-00003',
  '2024-02-17',
  'Dr. Omar Khalil',
  'Radiology',
  'X-Ray Film',
  'أفلام الأشعة السينية',
  'Medical X-ray film 14x17 inches',
  'Radiology Supplies',
  200,
  'Box',
  150000,
  30000000,
  'MEDIUM',
  '2024-03-10',
  'PENDING',
  NULL,
  NULL,
  NULL,
  NULL,
  'Radiology Supplies Co.',
  'Regular stock replenishment',
  'Standard order'
),
(
  'PR-2024-00004',
  '2024-02-17',
  'Admin Staff - Zainab',
  'Administration',
  'Office Furniture',
  'أثاث مكتبي',
  'Ergonomic office chairs and desks',
  'Office Supplies',
  10,
  'Set',
  500000,
  5000000,
  'LOW',
  '2024-04-01',
  'PENDING',
  NULL,
  NULL,
  NULL,
  NULL,
  'Office Furniture Iraq',
  'Expansion of administrative offices',
  'Can wait until budget approval'
),
(
  'PR-2024-00005',
  '2024-02-18',
  'Dr. Hassan Jabbar',
  'Orthopedics',
  'Orthopedic Implants',
  'زراعات العظام',
  'Titanium orthopedic implants set',
  'Medical Equipment',
  5,
  'Set',
  8000000,
  40000000,
  'HIGH',
  '2024-03-05',
  'PENDING',
  NULL,
  NULL,
  NULL,
  NULL,
  'Orthopedic Solutions',
  'Required for scheduled surgeries',
  'High-quality implants needed'
),

-- APPROVED Requests (7)
(
  'PR-2024-00006',
  '2024-02-10',
  'Dr. Sarah Ahmed',
  'Laboratory',
  'Blood Test Kits',
  'أدوات فحص الدم',
  'Complete blood count test kits',
  'Laboratory Supplies',
  300,
  'Kit',
  50000,
  15000000,
  'HIGH',
  '2024-02-28',
  'APPROVED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-12 10:30:00',
  'Approved. Essential for lab operations. Proceed with purchase.',
  NULL,
  'Lab Supplies International',
  'Monthly stock requirement',
  'Approved for immediate procurement'
),
(
  'PR-2024-00007',
  '2024-02-11',
  'Pharmacist Ali Mohammed',
  'Pharmacy',
  'Antibiotics Stock',
  'مخزون المضادات الحيوية',
  'Various antibiotics for pharmacy stock',
  'Pharmaceuticals',
  1000,
  'Unit',
  30000,
  30000000,
  'URGENT',
  '2024-02-20',
  'APPROVED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-11 14:00:00',
  'Urgent approval granted. Critical for patient care.',
  NULL,
  'Baghdad Pharmaceuticals',
  'Stock depletion due to high demand',
  'Fast-track procurement'
),
(
  'PR-2024-00008',
  '2024-02-09',
  'IT Manager - Youssef',
  'IT Department',
  'Computer Workstations',
  'محطات عمل الكمبيوتر',
  'Desktop computers with monitors',
  'IT Equipment',
  15,
  'Unit',
  2000000,
  30000000,
  'MEDIUM',
  '2024-03-15',
  'APPROVED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-13 09:00:00',
  'Approved within IT budget allocation.',
  NULL,
  'Tech Solutions Iraq',
  'Replacement of outdated systems',
  'Standard procurement process'
),
(
  'PR-2024-00009',
  '2024-02-08',
  'Dr. Layla Hassan',
  'Pediatrics',
  'Infant Incubators',
  'حاضنات الأطفال',
  'Neonatal incubators with monitoring',
  'Medical Equipment',
  3,
  'Unit',
  12000000,
  36000000,
  'HIGH',
  '2024-03-01',
  'APPROVED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-10 11:30:00',
  'Approved. Critical equipment for NICU expansion.',
  NULL,
  'Medical Equipment International',
  'NICU expansion project',
  'High priority procurement'
),
(
  'PR-2024-00010',
  '2024-02-07',
  'Maintenance - Tariq',
  'Maintenance',
  'HVAC Filters',
  'فلاتر التكييف',
  'Air conditioning filters for hospital',
  'Maintenance Supplies',
  100,
  'Unit',
  100000,
  10000000,
  'MEDIUM',
  '2024-03-10',
  'APPROVED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-09 15:00:00',
  'Approved. Regular maintenance requirement.',
  NULL,
  'HVAC Supplies Co.',
  'Quarterly maintenance schedule',
  'Standard order'
),
(
  'PR-2024-00011',
  '2024-02-06',
  'Dr. Nadia Ibrahim',
  'Obstetrics',
  'Ultrasound Machine',
  'جهاز الموجات فوق الصوتية',
  '4D ultrasound machine for obstetrics',
  'Medical Equipment',
  1,
  'Unit',
  25000000,
  25000000,
  'HIGH',
  '2024-03-20',
  'APPROVED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-08 10:00:00',
  'Approved after budget review. Essential for maternity ward.',
  NULL,
  'Medical Imaging Solutions',
  'Upgrade of imaging capabilities',
  'Capital equipment purchase'
),
(
  'PR-2024-00012',
  '2024-02-05',
  'Security - Mustafa',
  'Security',
  'Security Cameras',
  'كاميرات المراقبة',
  'IP security cameras with night vision',
  'Security Equipment',
  20,
  'Unit',
  500000,
  10000000,
  'MEDIUM',
  '2024-03-25',
  'APPROVED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-07 13:00:00',
  'Approved. Security enhancement project.',
  NULL,
  'Security Systems Iraq',
  'Hospital security upgrade',
  'Installation included'
),

-- DECLINED Requests (3)
(
  'PR-2024-00013',
  '2024-02-04',
  'Admin - Huda',
  'Administration',
  'Luxury Office Chairs',
  'كراسي مكتبية فاخرة',
  'Premium leather executive chairs',
  'Office Supplies',
  5,
  'Unit',
  3000000,
  15000000,
  'LOW',
  '2024-04-01',
  'DECLINED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-06 09:00:00',
  NULL,
  'Budget constraints. Standard chairs available. Not essential.',
  'Premium Office Furniture',
  'Office upgrade request',
  'Declined due to budget'
),
(
  'PR-2024-00014',
  '2024-02-03',
  'Dr. Rami Saleh',
  'Dermatology',
  'Cosmetic Laser Device',
  'جهاز ليزر تجميلي',
  'Cosmetic laser for aesthetic procedures',
  'Medical Equipment',
  1,
  'Unit',
  35000000,
  35000000,
  'LOW',
  '2024-05-01',
  'DECLINED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-05 14:00:00',
  NULL,
  'Not aligned with hospital core services. Focus on essential medical equipment.',
  'Aesthetic Equipment Co.',
  'Expansion into cosmetic services',
  'Declined - not core service'
),
(
  'PR-2024-00015',
  '2024-02-02',
  'Cafeteria - Amina',
  'Cafeteria',
  'Commercial Coffee Machine',
  'آلة قهوة تجارية',
  'High-end espresso machine for cafeteria',
  'Cafeteria Equipment',
  1,
  'Unit',
  8000000,
  8000000,
  'LOW',
  '2024-04-15',
  'DECLINED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-04 11:00:00',
  NULL,
  'Current equipment sufficient. Non-essential upgrade.',
  'Cafeteria Equipment Iraq',
  'Cafeteria upgrade',
  'Declined - current equipment adequate'
),

-- MORE_INFO_NEEDED Requests (3)
(
  'PR-2024-00016',
  '2024-02-01',
  'Dr. Basim Karim',
  'Surgery',
  'Surgical Instruments Set',
  'مجموعة أدوات جراحية',
  'Complete surgical instruments set',
  'Medical Equipment',
  3,
  'Set',
  6000000,
  18000000,
  'HIGH',
  '2024-03-10',
  'MORE_INFO_NEEDED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-03 10:00:00',
  NULL,
  'Please provide detailed specifications and comparison with existing inventory.',
  'Surgical Instruments Co.',
  'Replacement of worn instruments',
  'Awaiting additional information'
),
(
  'PR-2024-00017',
  '2024-01-31',
  'Lab Tech - Sami',
  'Laboratory',
  'Microscope',
  'مجهر',
  'Digital microscope with camera',
  'Laboratory Equipment',
  2,
  'Unit',
  4000000,
  8000000,
  'MEDIUM',
  '2024-03-20',
  'MORE_INFO_NEEDED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-02 15:00:00',
  NULL,
  'Need justification for quantity. Current microscopes status unclear.',
  'Lab Equipment Suppliers',
  'Lab equipment upgrade',
  'Pending clarification'
),
(
  'PR-2024-00018',
  '2024-01-30',
  'Nurse Coordinator - Maha',
  'ICU',
  'Patient Monitors',
  'أجهزة مراقبة المرضى',
  'Multi-parameter patient monitors',
  'Medical Equipment',
  8,
  'Unit',
  7000000,
  56000000,
  'HIGH',
  '2024-03-05',
  'MORE_INFO_NEEDED',
  'Finance Manager - Karim Al-Saadi',
  '2024-02-01 09:30:00',
  NULL,
  'High cost. Please provide cost-benefit analysis and alternative quotes.',
  'Medical Monitoring Systems',
  'ICU expansion',
  'Requires additional documentation'
),

-- PROCESSING Requests (2)
(
  'PR-2024-00019',
  '2024-01-28',
  'Pharmacist Rana',
  'Pharmacy',
  'Medication Storage Refrigerator',
  'ثلاجة تخزين الأدوية',
  'Medical-grade refrigerator for medications',
  'Pharmacy Equipment',
  2,
  'Unit',
  4500000,
  9000000,
  'HIGH',
  '2024-02-28',
  'PROCESSING',
  'Finance Manager - Karim Al-Saadi',
  '2024-01-30 14:00:00',
  'Approved. Purchase order being prepared.',
  NULL,
  'Medical Refrigeration Co.',
  'Temperature-sensitive medication storage',
  'PO in progress'
),
(
  'PR-2024-00020',
  '2024-01-27',
  'Dr. Waleed Nasser',
  'Anesthesiology',
  'Anesthesia Machine',
  'جهاز التخدير',
  'Modern anesthesia workstation',
  'Medical Equipment',
  1,
  'Unit',
  45000000,
  45000000,
  'URGENT',
  '2024-02-25',
  'PROCESSING',
  'Finance Manager - Karim Al-Saadi',
  '2024-01-29 10:00:00',
  'Approved. Urgent procurement in progress.',
  NULL,
  'Anesthesia Equipment International',
  'Critical equipment for operating rooms',
  'Fast-track procurement approved'
);

-- Verify data
SELECT 
  request_number,
  request_date,
  requested_by,
  department,
  item_name,
  priority,
  status,
  estimated_total_price,
  reviewed_by,
  reviewed_at
FROM purchase_requests 
ORDER BY request_date DESC;
