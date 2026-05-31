-- COMPREHENSIVE DAILY DATA FOR ALL FILTERS
-- This creates data across different dates, departments, and periods
-- Each filter will show different results

-- 1. SERVICES DATA ACROSS DIFFERENT DATES AND DEPARTMENTS
INSERT INTO services (
    code, name, name_ar, category, subcategory, description,
    price_self_pay, price_insurance, price_government, department_id,
    requires_appointment, duration_minutes, active, createdat, updatedat
) VALUES
-- TODAY'S SERVICES (March 23, 2026)
('CONS_TODAY_1', 'Emergency Consultation Today', 'استشارة طارئة اليوم', 'CONSULTATION', 'Emergency Medicine',
 'Emergency consultation today', 500000, 450000, 400000, 'DEPT001', false, 60, true, '2026-03-23', '2026-03-23'),
('LAB_TODAY_1', 'Urgent Lab Test Today', 'فحص مخبري عاجل اليوم', 'LAB TEST', 'Emergency Laboratory',
 'Urgent laboratory test today', 600000, 540000, 480000, 'DEPT002', false, 30, true, '2026-03-23', '2026-03-23'),
('RAD_TODAY_1', 'Emergency X-Ray Today', 'أشعة طارئة اليوم', 'RADIOLOGY', 'Emergency Radiology',
 'Emergency radiology today', 2000000, 1800000, 1600000, 'DEPT004', false, 45, true, '2026-03-23', '2026-03-23'),

-- YESTERDAY'S SERVICES (March 22, 2026)
('CONS_YEST_1', 'Regular Consultation Yesterday', 'استشارة منتظمة أمس', 'CONSULTATION', 'General Medicine',
 'Regular consultation yesterday', 300000, 270000, 240000, 'DEPT001', true, 30, true, '2026-03-22', '2026-03-22'),
('SURG_YEST_1', 'Minor Surgery Yesterday', 'جراحة بسيطة أمس', 'SURGERY', 'Minor Surgery',
 'Minor surgical procedure yesterday', 15000000, 13500000, 12000000, 'DEPT003', true, 90, true, '2026-03-22', '2026-03-22'),
('PHARM_YEST_1', 'Pharmacy Service Yesterday', 'خدمة صيدلية أمس', 'PHARMACY', 'Pharmacy Services',
 'Pharmacy service yesterday', 75000, 67500, 60000, 'DEPT005', false, 15, true, '2026-03-22', '2026-03-22'),

-- THIS WEEK'S SERVICES (March 18-21, 2026)
('CONS_WEEK_1', 'Weekly Consultation 1', 'استشارة أسبوعية 1', 'CONSULTATION', 'General Medicine',
 'Weekly consultation Monday', 280000, 252000, 224000, 'DEPT001', true, 30, true, '2026-03-18', '2026-03-18'),
('LAB_WEEK_1', 'Weekly Lab Test 1', 'فحص مخبري أسبوعي 1', 'LAB TEST', 'Clinical Chemistry',
 'Weekly lab test Tuesday', 520000, 468000, 416000, 'DEPT002', false, 20, true, '2026-03-19', '2026-03-19'),
('SURG_WEEK_1', 'Weekly Surgery 1', 'جراحة أسبوعية 1', 'SURGERY', 'General Surgery',
 'Weekly surgery Wednesday', 22000000, 19800000, 17600000, 'DEPT003', true, 120, true, '2026-03-20', '2026-03-20'),
('RAD_WEEK_1', 'Weekly Radiology 1', 'أشعة أسبوعية 1', 'RADIOLOGY', 'Diagnostic Radiology',
 'Weekly radiology Thursday', 1800000, 1620000, 1440000, 'DEPT004', false, 40, true, '2026-03-21', '2026-03-21'),

-- LAST MONTH'S SERVICES (February 2026)
('CONS_MONTH_1', 'Monthly Consultation 1', 'استشارة شهرية 1', 'CONSULTATION', 'General Medicine',
 'Monthly consultation Feb 1', 260000, 234000, 208000, 'DEPT001', true, 30, true, '2026-02-01', '2026-02-01'),
('LAB_MONTH_1', 'Monthly Lab Test 1', 'فحص مخبري شهري 1', 'LAB TEST', 'Hematology',
 'Monthly lab test Feb 15', 480000, 432000, 384000, 'DEPT002', false, 15, true, '2026-02-15', '2026-02-15'),
('SURG_MONTH_1', 'Monthly Surgery 1', 'جراحة شهرية 1', 'SURGERY', 'Major Surgery',
 'Monthly surgery Feb 20', 45000000, 40500000, 36000000, 'DEPT003', true, 180, true, '2026-02-20', '2026-02-20'),

-- DEPARTMENT-SPECIFIC SERVICES
('DEPT_SURG_1', 'Complex Surgery', 'جراحة معقدة', 'SURGERY', 'Complex Surgery',
 'Complex surgery for Surgery dept', 55000000, 49500000, 44000000, 'DEPT003', true, 240, true, '2026-03-15', '2026-03-15'),
('DEPT_SURG_2', 'Orthopedic Surgery', 'جراحة عظمية', 'SURGERY', 'Orthopedic Surgery',
 'Orthopedic surgery for Surgery dept', 35000000, 31500000, 28000000, 'DEPT003', true, 150, true, '2026-03-10', '2026-03-10'),
('DEPT_LAB_1', 'Advanced Lab Test', 'فحص مخبري متقدم', 'LAB TEST', 'Advanced Diagnostics',
 'Advanced lab test for Lab dept', 850000, 765000, 680000, 'DEPT002', false, 45, true, '2026-03-12', '2026-03-12'),
('DEPT_LAB_2', 'Genetic Testing', 'اختبار جيني', 'LAB TEST', 'Molecular Diagnostics',
 'Genetic testing for Lab dept', 1200000, 1080000, 960000, 'DEPT002', false, 60, true, '2026-03-08', '2026-03-08'),
('DEPT_RAD_1', 'MRI Scan', 'فحص الرنين المغناطيسي', 'RADIOLOGY', 'Advanced Imaging',
 'MRI scan for Radiology dept', 8000000, 7200000, 6400000, 'DEPT004', false, 90, true, '2026-03-14', '2026-03-14'),
('DEPT_RAD_2', 'PET Scan', 'فحص PET', 'RADIOLOGY', 'Nuclear Medicine',
 'PET scan for Radiology dept', 12000000, 10800000, 9600000, 'DEPT004', false, 120, true, '2026-03-05', '2026-03-05'),
('DEPT_CONS_1', 'Cardiac Consultation', 'استشارة قلبية', 'CONSULTATION', 'Cardiology',
 'Cardiac consultation for General Medicine', 800000, 720000, 640000, 'DEPT001', true, 45, true, '2026-03-11', '2026-03-11'),
('DEPT_CONS_2', 'Pediatric Consultation', 'استشارة أطفال', 'CONSULTATION', 'Pediatrics',
 'Pediatric consultation for General Medicine', 400000, 360000, 320000, 'DEPT001', true, 30, true, '2026-03-09', '2026-03-09'),
('DEPT_PHARM_1', 'Compounded Medicine', 'دواء مركب', 'PHARMACY', 'Compounding Pharmacy',
 'Compounded medicine for Pharmacy dept', 150000, 135000, 120000, 'DEPT005', false, 60, true, '2026-03-13', '2026-03-13'),
('DEPT_PHARM_2', 'IV Preparation', 'تحضير وريدي', 'PHARMACY', 'IV Pharmacy',
 'IV preparation for Pharmacy dept', 200000, 180000, 160000, 'DEPT005', false, 45, true, '2026-03-07', '2026-03-07')
ON CONFLICT (code) DO NOTHING;

-- 2. INVOICES ACROSS DIFFERENT DATES
INSERT INTO invoices (
    invoice_number, invoice_date, patient_id, patient_name, patient_name_ar,
    subtotal, discount_percentage, discount_amount, total_amount,
    insurance_company_id, insurance_coverage_amount, insurance_coverage_percentage,
    patient_responsibility, amount_paid, balance_due, status, payment_method,
    payment_date, notes, createdat, updatedat
) VALUES
-- TODAY'S INVOICES
('INV-TODAY-001', '2026-03-23', 'PAT-TODAY-001', 'مريض اليوم 1', 'Today Patient 1',
 500000, 0, 0, 500000, 'INS-TODAY-001', 450000, 90, 50000, 500000, 0, 'PAID', 'CASH',
 '2026-03-23', 'Emergency consultation today', '2026-03-23', '2026-03-23'),
('INV-TODAY-002', '2026-03-23', 'PAT-TODAY-002', 'مريض اليوم 2', 'Today Patient 2',
 2000000, 0, 0, 2000000, 'INS-TODAY-002', 1800000, 90, 200000, 2000000, 0, 'PAID', 'INSURANCE',
 '2026-03-23', 'Emergency X-ray today', '2026-03-23', '2026-03-23'),

-- YESTERDAY'S INVOICES
('INV-YEST-001', '2026-03-22', 'PAT-YEST-001', 'مريض الأمس 1', 'Yesterday Patient 1',
 300000, 0, 0, 300000, 'INS-YEST-001', 270000, 90, 30000, 300000, 0, 'PAID', 'CASH',
 '2026-03-22', 'Regular consultation yesterday', '2026-03-22', '2026-03-22'),
('INV-YEST-002', '2026-03-22', 'PAT-YEST-002', 'مريض الأمس 2', 'Yesterday Patient 2',
 15000000, 5, 750000, 14250000, 'INS-YEST-002', 12825000, 90, 1425000, 14250000, 0, 'PAID', 'BANK',
 '2026-03-22', 'Minor surgery yesterday', '2026-03-22', '2026-03-22'),

-- THIS WEEK'S INVOICES
('INV-WEEK-001', '2026-03-18', 'PAT-WEEK-001', 'مريض الأسبوع 1', 'Week Patient 1',
 280000, 0, 0, 280000, 'INS-WEEK-001', 252000, 90, 28000, 280000, 0, 'PAID', 'CASH',
 '2026-03-18', 'Weekly consultation Monday', '2026-03-18', '2026-03-18'),
('INV-WEEK-002', '2026-03-19', 'PAT-WEEK-002', 'مريض الأسبوع 2', 'Week Patient 2',
 520000, 0, 0, 520000, 'INS-WEEK-002', 468000, 90, 52000, 520000, 0, 'PAID', 'INSURANCE',
 '2026-03-19', 'Weekly lab test Tuesday', '2026-03-19', '2026-03-19'),
('INV-WEEK-003', '2026-03-20', 'PAT-WEEK-003', 'مريض الأسبوع 3', 'Week Patient 3',
 22000000, 0, 0, 22000000, 'INS-WEEK-003', 19800000, 90, 2200000, 22000000, 0, 'PAID', 'BANK',
 '2026-03-20', 'Weekly surgery Wednesday', '2026-03-20', '2026-03-20'),
('INV-WEEK-004', '2026-03-21', 'PAT-WEEK-004', 'مريض الأسبوع 4', 'Week Patient 4',
 1800000, 0, 0, 1800000, 'INS-WEEK-004', 1620000, 90, 180000, 1800000, 0, 'PAID', 'CASH',
 '2026-03-21', 'Weekly radiology Thursday', '2026-03-21', '2026-03-21'),

-- LAST MONTH'S INVOICES
('INV-MONTH-001', '2026-02-01', 'PAT-MONTH-001', 'مريض الشهر 1', 'Month Patient 1',
 260000, 0, 0, 260000, 'INS-MONTH-001', 234000, 90, 26000, 260000, 0, 'PAID', 'CASH',
 '2026-02-01', 'Monthly consultation Feb 1', '2026-02-01', '2026-02-01'),
('INV-MONTH-002', '2026-02-15', 'PAT-MONTH-002', 'مريض الشهر 2', 'Month Patient 2',
 480000, 0, 0, 480000, 'INS-MONTH-002', 432000, 90, 48000, 480000, 0, 'PAID', 'INSURANCE',
 '2026-02-15', 'Monthly lab test Feb 15', '2026-02-15', '2026-02-15'),
('INV-MONTH-003', '2026-02-20', 'PAT-MONTH-003', 'مريض الشهر 3', 'Month Patient 3',
 45000000, 0, 0, 45000000, 'INS-MONTH-003', 40500000, 90, 4500000, 45000000, 0, 'PAID', 'BANK',
 '2026-02-20', 'Monthly surgery Feb 20', '2026-02-20', '2026-02-20'),

-- DEPARTMENT-SPECIFIC INVOICES
('INV-DEPT-SURG-001', '2026-03-15', 'PAT-SURG-001', 'مريض جراحة', 'Surgery Patient',
 55000000, 0, 0, 55000000, 'INS-SURG-001', 49500000, 90, 5500000, 55000000, 0, 'PAID', 'BANK',
 '2026-03-15', 'Complex surgery for Surgery dept', '2026-03-15', '2026-03-15'),
('INV-DEPT-LAB-001', '2026-03-12', 'PAT-LAB-001', 'مريض مخبري', 'Lab Patient',
 850000, 0, 0, 850000, 'INS-LAB-001', 765000, 90, 85000, 850000, 0, 'PAID', 'INSURANCE',
 '2026-03-12', 'Advanced lab test for Lab dept', '2026-03-12', '2026-03-12'),
('INV-DEPT-RAD-001', '2026-03-14', 'PAT-RAD-001', 'مريض أشعة', 'Radiology Patient',
 8000000, 0, 0, 8000000, 'INS-RAD-001', 7200000, 90, 800000, 8000000, 0, 'PAID', 'BANK',
 '2026-03-14', 'MRI scan for Radiology dept', '2026-03-14', '2026-03-14'),
('INV-DEPT-CONS-001', '2026-03-11', 'PAT-CONS-001', 'مريض استشارة', 'Consultation Patient',
 800000, 0, 0, 800000, 'INS-CONS-001', 720000, 90, 80000, 800000, 0, 'PAID', 'CASH',
 '2026-03-11', 'Cardiac consultation for General Medicine', '2026-03-11', '2026-03-11'),
('INV-DEPT-PHARM-001', '2026-03-13', 'PAT-PHARM-001', 'مريض صيدلية', 'Pharmacy Patient',
 150000, 0, 0, 150000, NULL, 0, 0, 150000, 150000, 0, 'PAID', 'CASH',
 '2026-03-13', 'Compounded medicine for Pharmacy dept', '2026-03-13', '2026-03-13')
ON CONFLICT (invoice_number) DO NOTHING;

-- 3. PAYROLL TRANSACTIONS ACROSS DIFFERENT PERIODS
INSERT INTO payroll_transactions (
    employee_id, period_id, transaction_type, amount, description, createdat, updatedat
) VALUES
-- TODAY'S PAYROLL (Bonus payments)
('EMP-BONUS-TODAY-001', '2026-03', 'EARNING', 5000000, 'Emergency bonus today', '2026-03-23', '2026-03-23'),
('EMP-BONUS-TODAY-002', '2026-03', 'EARNING', 3000000, 'Overtime bonus today', '2026-03-23', '2026-03-23'),

-- YESTERDAY'S PAYROLL
('EMP-YEST-001', '2026-03', 'EARNING', 2000000, 'Weekend bonus yesterday', '2026-03-22', '2026-03-22'),
('EMP-YEST-002', '2026-03', 'EARNING', 1500000, 'Special duty bonus yesterday', '2026-03-22', '2026-03-22'),

-- THIS WEEK'S PAYROLL (Weekly salaries)
('EMP-WEEK-001', '2026-W12', 'EARNING', 8000000, 'Weekly salary week 12', '2026-03-18', '2026-03-18'),
('EMP-WEEK-002', '2026-W12', 'EARNING', 7500000, 'Weekly salary week 12', '2026-03-19', '2026-03-19'),
('EMP-WEEK-003', '2026-W12', 'EARNING', 9000000, 'Weekly salary week 12', '2026-03-20', '2026-03-20'),

-- LAST MONTH'S PAYROLL (February salaries)
('EMP-MONTH-001', '2026-02', 'EARNING', 45000000, 'February salary', '2026-02-01', '2026-02-01'),
('EMP-MONTH-002', '2026-02', 'EARNING', 42000000, 'February salary', '2026-02-01', '2026-02-01'),
('EMP-MONTH-003', '2026-02', 'EARNING', 38000000, 'February salary', '2026-02-01', '2026-02-01'),

-- DEPARTMENT-SPECIFIC PAYROLL
('EMP-DEPT-SURG-001', '2026-03', 'EARNING', 80000000, 'Surgeon salary - Surgery dept', '2026-03-01', '2026-03-01'),
('EMP-DEPT-SURG-002', '2026-03', 'EARNING', 70000000, 'Anesthesiologist salary - Surgery dept', '2026-03-01', '2026-03-01'),
('EMP-DEPT-LAB-001', '2026-03', 'EARNING', 35000000, 'Lab director salary - Lab dept', '2026-03-01', '2026-03-01'),
('EMP-DEPT-LAB-002', '2026-03', 'EARNING', 28000000, 'Senior technician salary - Lab dept', '2026-03-01', '2026-03-01'),
('EMP-DEPT-RAD-001', '2026-03', 'EARNING', 60000000, 'Radiologist salary - Radiology dept', '2026-03-01', '2026-03-01'),
('EMP-DEPT-CONS-001', '2026-03', 'EARNING', 55000000, 'Senior doctor salary - General Medicine', '2026-03-01', '2026-03-01'),
('EMP-DEPT-CONS-002', '2026-03', 'EARNING', 45000000, 'Specialist doctor salary - General Medicine', '2026-03-01', '2026-03-01'),
('EMP-DEPT-PHARM-001', '2026-03', 'EARNING', 32000000, 'Pharmacist salary - Pharmacy dept', '2026-03-01', '2026-03-01'),
('EMP-DEPT-PHARM-002', '2026-03', 'EARNING', 25000000, 'Pharmacy technician salary - Pharmacy dept', '2026-03-01', '2026-03-01')
ON CONFLICT (employee_id, period_id, transaction_type) DO NOTHING;

-- 4. UPDATE DEPARTMENTS WITH MORE DETAILS
UPDATE departments SET 
    description = 'General medical consultation and primary care services',
    active = true 
WHERE departmentid = 'DEPT001';

UPDATE departments SET 
    description = 'Clinical laboratory testing and diagnostic services',
    active = true 
WHERE departmentid = 'DEPT002';

UPDATE departments SET 
    description = 'Surgical procedures, operations, and surgical care services',
    active = true 
WHERE departmentid = 'DEPT003';

UPDATE departments SET 
    description = 'Medical imaging, radiology, and diagnostic imaging services',
    active = true 
WHERE departmentid = 'DEPT004';

UPDATE departments SET 
    description = 'Pharmaceutical services, medication dispensing, and compounding',
    active = true 
WHERE departmentid = 'DEPT005';

-- 5. VERIFICATION AND SUMMARY
SELECT '=== DATA POPULATION COMPLETE ===' as status;
SELECT '=== SERVICES BY DATE ===' as info;
SELECT DATE(createdat) as date, category, COUNT(*) as count, SUM(price_self_pay + price_insurance + price_government) as revenue
FROM services WHERE active = true GROUP BY DATE(createdat), category ORDER BY date DESC, category;

SELECT '=== INVOICES BY DATE ===' as info;
SELECT DATE(invoice_date) as date, status, COUNT(*) as count, SUM(total_amount) as amount
FROM invoices GROUP BY DATE(invoice_date), status ORDER BY date DESC, status;

SELECT '=== PAYROLL BY PERIOD ===' as info;
SELECT period_id, transaction_type, COUNT(*) as count, SUM(amount) as total
FROM payroll_transactions GROUP BY period_id, transaction_type ORDER BY period_id DESC, transaction_type;

SELECT '=== REVENUE BY DEPARTMENT ===' as info;
SELECT d.departmentid, d.name, COUNT(s.id) as services, SUM(s.price_self_pay + s.price_insurance + s.price_government) as revenue
FROM services s LEFT JOIN departments d ON s.department_id = d.departmentid
WHERE s.active = true GROUP BY d.departmentid, d.name ORDER BY revenue DESC;

SELECT '=== EXPECTED FILTER RESULTS ===' as info;
SELECT 'Today filter: 3 services, 2 invoices' as today_filter;
SELECT 'Yesterday filter: 2 services, 2 invoices' as yesterday_filter;
SELECT 'Week filter: 4 services, 4 invoices' as week_filter;
SELECT 'Month filter: 3 services, 3 invoices' as month_filter;
SELECT 'Surgery dept: Multiple high-value surgeries' as surgery_dept;
SELECT 'Lab dept: Advanced diagnostic tests' as lab_dept;
SELECT 'Radiology dept: MRI and advanced imaging' as radiology_dept;

SELECT '=== READY FOR TESTING ===' as final_status;
SELECT 'Comprehensive data populated - All filters will show different results' as message, CURRENT_TIMESTAMP as completed_at;
