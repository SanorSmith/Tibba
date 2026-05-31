-- Push Mock Data to Real Database Tables
-- This script converts mock data into real database records
-- Run this to populate your tables with realistic financial data

-- 1. INSERT MOCK SERVICES DATA
INSERT INTO services (
    code,
    name,
    name_ar,
    category,
    subcategory,
    description,
    price_self_pay,
    price_insurance,
    price_government,
    department_id,
    requires_appointment,
    duration_minutes,
    active,
    createdat,
    updatedat
) VALUES
-- CONSULTATION Services
('CONS001', 'General Consultation', 'استشارة عامة', 'CONSULTATION', 'General Medicine', 
 'General medical consultation for common health issues', 275000, 247500, 220000, 'DEPT001', true, 30, true, 
 '2026-03-01', '2026-03-01'),

('CONS002', 'Specialist Consultation', 'استشارة متخصصة', 'CONSULTATION', 'Specialist Medicine',
 'Specialist medical consultation with advanced diagnostics', 350000, 315000, 280000, 'DEPT001', true, 45, true,
 '2026-03-02', '2026-03-02'),

('CONS003', 'Emergency Consultation', 'استشارة طارئة', 'CONSULTATION', 'Emergency Medicine',
 'Emergency medical consultation for urgent cases', 450000, 405000, 360000, 'DEPT001', false, 60, true,
 '2026-03-03', '2026-03-03'),

-- LAB TEST Services
('LAB001', 'Complete Blood Count', 'فحص الدم الكامل', 'LAB TEST', 'Hematology',
 'Complete blood count with differential', 435000, 391500, 348000, 'DEPT002', false, 15, true,
 '2026-03-01', '2026-03-01'),

('LAB002', 'Chemistry Panel', 'لوحة الكيمياء', 'LAB TEST', 'Clinical Chemistry',
 'Comprehensive metabolic panel', 550000, 495000, 440000, 'DEPT002', false, 20, true,
 '2026-03-02', '2026-03-02'),

('LAB003', 'Urinalysis', 'تحليل البول', 'LAB TEST', 'Clinical Pathology',
 'Complete urinalysis with microscopy', 320000, 288000, 256000, 'DEPT002', false, 10, true,
 '2026-03-03', '2026-03-03'),

-- SURGERY Services
('SURG001', 'Appendectomy', 'استئصال الزائدة الدودية', 'SURGERY', 'General Surgery',
 'Laparoscopic appendectomy procedure', 26000000, 23400000, 20800000, 'DEPT003', true, 120, true,
 '2026-03-02', '2026-03-02'),

('SURG002', 'Cholecystectomy', 'استئصال المرارة', 'SURGERY', 'General Surgery',
 'Laparoscopic cholecystectomy', 35000000, 31500000, 28000000, 'DEPT003', true, 150, true,
 '2026-03-03', '2026-03-03'),

('SURG003', 'Hernia Repair', 'إصلاق الفتق', 'SURGERY', 'General Surgery',
 'Inguinal hernia repair with mesh', 18000000, 16200000, 14400000, 'DEPT003', true, 90, true,
 '2026-03-04', '2026-03-04'),

-- RADIOLOGY Services
('RAD001', 'Chest X-Ray', 'أشعة الصدر', 'RADIOLOGY', 'Diagnostic Radiology',
 'Standard chest radiography', 1600000, 1440000, 1280000, 'DEPT004', false, 30, true,
 '2026-03-01', '2026-03-01'),

('RAD002', 'CT Scan Head', 'أشعة مقطعية للرأس', 'RADIOLOGY', 'Diagnostic Radiology',
 'Computed tomography of head without contrast', 3500000, 3150000, 2800000, 'DEPT004', false, 45, true,
 '2026-03-02', '2026-03-02'),

('RAD003', 'Ultrasound Abdomen', 'الموجات فوق الصوتية للبطن', 'RADIOLOGY', 'Diagnostic Radiology',
 'Abdominal ultrasound examination', 1200000, 1080000, 960000, 'DEPT004', false, 40, true,
 '2026-03-03', '2026-03-03'),

-- PHARMACY Services
('PHARM001', 'Prescription Filling', 'صرف الوصفات الطبية', 'PHARMACY', 'Pharmacy Services',
 'Professional prescription filling service', 25000, 22500, 20000, 'DEPT005', false, 10, true,
 '2026-03-04', '2026-03-04'),

('PHARM002', 'Medication Counseling', 'استشارة دوائية', 'PHARMACY', 'Pharmacy Services',
 'Patient medication counseling and education', 35000, 31500, 28000, 'DEPT005', false, 20, true,
 '2026-03-04', '2026-03-04'),

('PHARM003', 'Compounding Service', 'خدمة التركيب', 'PHARMACY', 'Pharmacy Services',
 'Custom medication compounding', 45000, 40500, 36000, 'DEPT005', false, 30, true,
 '2026-03-04', '2026-03-04')
ON CONFLICT (code) DO NOTHING;

-- 2. INSERT MOCK INVOICES DATA
INSERT INTO invoices (
    invoice_number,
    invoice_date,
    patient_id,
    patient_name,
    patient_name_ar,
    subtotal,
    discount_percentage,
    discount_amount,
    total_amount,
    insurance_company_id,
    insurance_coverage_amount,
    insurance_coverage_percentage,
    patient_responsibility,
    amount_paid,
    balance_due,
    status,
    payment_method,
    payment_date,
    notes,
    createdat,
    updatedat
) VALUES
-- Paid invoices for revenue
('INV-2024-001', '2026-03-01', 'PAT001', 'أحمد محمد', 'Ahmed Mohammed', 
 275000, 0, 0, 275000, 'INS001', 247500, 90, 27500, 275000, 0, 'PAID', 'CASH', 
 '2026-03-01', 'General consultation', '2026-03-01', '2026-03-01'),

('INV-2024-002', '2026-03-02', 'PAT002', 'فاطمة علي', 'Fatima Ali',
 435000, 0, 0, 435000, 'INS002', 391500, 90, 43500, 435000, 0, 'PAID', 'INSURANCE',
 '2026-03-02', 'Blood test complete', '2026-03-02', '2026-03-02'),

('INV-2024-003', '2026-03-03', 'PAT003', 'محمد حسن', 'Mohammed Hassan',
 26000000, 0, 0, 26000000, 'INS003', 23400000, 90, 2600000, 26000000, 0, 'PAID', 'BANK',
 '2026-03-03', 'Appendectomy surgery', '2026-03-03', '2026-03-03'),

('INV-2024-004', '2026-03-04', 'PAT004', 'سارة أحمد', 'Sarah Ahmed',
 1600000, 0, 0, 1600000, 'INS001', 1440000, 90, 160000, 1600000, 0, 'PAID', 'CASH',
 '2026-03-04', 'Chest X-ray', '2026-03-04', '2026-03-04'),

('INV-2024-005', '2026-03-04', 'PAT005', 'عمر خالد', 'Omar Khalid',
 25000, 0, 0, 25000, NULL, 0, 0, 25000, 25000, 0, 'PAID', 'CASH',
 '2026-03-04', 'Prescription filling', '2026-03-04', '2026-03-04'),

-- Additional invoices for more revenue
('INV-2024-006', '2026-03-02', 'PAT006', 'ليلى حسين', 'Layla Hussein',
 350000, 10, 35000, 315000, 'INS002', 283500, 90, 31500, 315000, 0, 'PAID', 'INSURANCE',
 '2026-03-02', 'Specialist consultation', '2026-03-02', '2026-03-02'),

('INV-2024-007', '2026-03-03', 'PAT007', 'كريم سالم', 'Kareem Salem',
 450000, 5, 22500, 427500, 'INS003', 384750, 90, 42750, 427500, 0, 'PAID', 'BANK',
 '2026-03-03', 'Emergency consultation', '2026-03-03', '2026-03-03'),

('INV-2024-008', '2026-03-03', 'PAT008', 'نورا محمود', 'Nora Mahmoud',
 550000, 0, 0, 550000, 'INS001', 495000, 90, 55000, 550000, 0, 'PAID', 'INSURANCE',
 '2026-03-03', 'Chemistry panel', '2026-03-03', '2026-03-03'),

('INV-2024-009', '2026-03-04', 'PAT009', 'حسن عبدالله', 'Hassan Abdullah',
 320000, 0, 0, 320000, 'INS002', 288000, 90, 32000, 320000, 0, 'PAID', 'CASH',
 '2026-03-04', 'Urinalysis test', '2026-03-04', '2026-03-04'),

('INV-2024-010', '2026-03-04', 'PAT010', 'مريم يوسف', 'Mariam Youssef',
 35000000, 0, 0, 35000000, 'INS003', 31500000, 90, 3500000, 35000000, 0, 'PAID', 'BANK',
 '2026-03-04', 'Cholecystectomy surgery', '2026-03-04', '2026-03-04')
ON CONFLICT (invoice_number) DO NOTHING;

-- 3. INSERT MOCK PAYROLL TRANSACTIONS (for expenses)
INSERT INTO payroll_transactions (
    employee_id,
    period_id,
    transaction_type,
    amount,
    description,
    createdat,
    updatedat
) VALUES
-- Salary expenses (EARNING type)
('EMP001', '2026-03', 'EARNING', 40000000, 'Dr. Ahmed Mohammed - Base Salary', '2026-03-01', '2026-03-01'),
('EMP002', '2026-03', 'EARNING', 35000000, 'Dr. Fatima Ali - Base Salary', '2026-03-01', '2026-03-01'),
('EMP003', '2026-03', 'EARNING', 45000000, 'Dr. Mohammed Hassan - Surgeon Salary', '2026-03-01', '2026-03-01'),
('EMP004', '2026-03', 'EARNING', 25000000, 'Dr. Sarah Ahmed - Base Salary', '2026-03-01', '2026-03-01'),
('EMP005', '2026-03', 'EARNING', 30000000, 'Dr. Omar Khalid - Base Salary', '2026-03-01', '2026-03-01'),
('EMP006', '2026-03', 'EARNING', 20000000, 'Nurse Layla Hussein - Base Salary', '2026-03-01', '2026-03-01'),
('EMP007', '2026-03', 'EARNING', 18000000, 'Nurse Kareem Salem - Base Salary', '2026-03-01', '2026-03-01'),
('EMP008', '2026-03', 'EARNING', 22000000, 'Lab Technician Nora Mahmoud - Base Salary', '2026-03-01', '2026-03-01'),
('EMP009', '2026-03', 'EARNING', 15000000, 'Pharmacist Hassan Abdullah - Base Salary', '2026-03-01', '2026-03-01'),
('EMP010', '2026-03', 'EARNING', 25000000, 'Radiologist Mariam Youssef - Base Salary', '2026-03-01', '2026-03-01'),

-- Additional staff salaries to reach 120,000,000 total
('EMP011', '2026-03', 'EARNING', 15000000, 'Administrative Staff - Base Salary', '2026-03-01', '2026-03-01'),
('EMP012', '2026-03', 'EARNING', 12000000, 'Maintenance Staff - Base Salary', '2026-03-01', '2026-03-01'),
('EMP013', '2026-03', 'EARNING', 10000000, 'Support Staff - Base Salary', '2026-03-01', '2026-03-01'),
('EMP014', '2026-03', 'EARNING', 8000000, 'Security Staff - Base Salary', '2026-03-01', '2026-03-01'),
('EMP015', '2026-03', 'EARNING', 6000000, 'Cleaning Staff - Base Salary', '2026-03-01', '2026-03-01')
ON CONFLICT (employee_id, period_id, transaction_type) DO NOTHING;

-- 4. UPDATE DEPARTMENT NAMES (if departments table exists)
UPDATE departments SET name = 'General Medicine' WHERE departmentid = 'DEPT001';
UPDATE departments SET name = 'Laboratory' WHERE departmentid = 'DEPT002';
UPDATE departments SET name = 'Surgery' WHERE departmentid = 'DEPT003';
UPDATE departments SET name = 'Radiology' WHERE departmentid = 'DEPT004';
UPDATE departments SET name = 'Pharmacy' WHERE departmentid = 'DEPT005';

-- 5. INSERT DEPARTMENTS IF THEY DON'T EXIST
INSERT INTO departments (departmentid, name, description, active, createdat, updatedat) VALUES
('DEPT001', 'General Medicine', 'General medical consultation and primary care', true, CURRENT_DATE, CURRENT_DATE),
('DEPT002', 'Laboratory', 'Clinical laboratory and diagnostic testing', true, CURRENT_DATE, CURRENT_DATE),
('DEPT003', 'Surgery', 'Surgical procedures and operations', true, CURRENT_DATE, CURRENT_DATE),
('DEPT004', 'Radiology', 'Medical imaging and radiology services', true, CURRENT_DATE, CURRENT_DATE),
('DEPT005', 'Pharmacy', 'Pharmaceutical services and medication dispensing', true, CURRENT_DATE, CURRENT_DATE)
ON CONFLICT (departmentid) DO NOTHING;

-- 6. VERIFICATION QUERIES
SELECT '=== SERVICES DATA INSERTED ===' as status;
SELECT category, COUNT(*) as count, SUM(price_self_pay + price_insurance + price_government) as total_revenue 
FROM services WHERE active = true GROUP BY category ORDER BY total_revenue DESC;

SELECT '=== INVOICES DATA INSERTED ===' as status;
SELECT status, COUNT(*) as count, SUM(total_amount) as total_amount 
FROM invoices GROUP BY status ORDER BY status;

SELECT '=== PAYROLL DATA INSERTED ===' as status;
SELECT transaction_type, COUNT(*) as count, SUM(amount) as total_amount 
FROM payroll_transactions GROUP BY transaction_type ORDER BY total_amount DESC;

SELECT '=== FINANCIAL SUMMARY ===' as status;
SELECT 
  (SELECT SUM(price_self_pay + price_insurance + price_government) FROM services WHERE active = true) as service_revenue,
  (SELECT SUM(total_amount) FROM invoices WHERE status = 'PAID') as invoice_revenue,
  (SELECT SUM(amount) FROM payroll_transactions WHERE transaction_type = 'EARNING') as payroll_expenses,
  (SELECT SUM(price_self_pay + price_insurance + price_government) FROM services WHERE active = true) + 
  (SELECT SUM(total_amount) FROM invoices WHERE status = 'PAID') as total_revenue,
  (SELECT SUM(amount) FROM payroll_transactions WHERE transaction_type = 'EARNING') as total_expenses;

SELECT '=== COMPLETION STATUS ===' as status;
SELECT 'Mock data successfully pushed to database tables' as message, CURRENT_TIMESTAMP as completed_at;
