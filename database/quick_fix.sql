-- QUICK FIX - Execute this in your active SQL session
-- This will populate the database with real data

-- Insert sample services for DEPT002 (Laboratory)
INSERT INTO services (code, name, name_ar, category, subcategory, description, price_self_pay, price_insurance, price_government, department_id, requires_appointment, duration_minutes, active, createdat, updatedat) VALUES
('LAB_WEEK_1', 'Weekly Lab Test 1', 'فحص مخبري أسبوعي 1', 'LAB TEST', 'Clinical Chemistry', 'Weekly lab test Tuesday', 520000, 468000, 416000, 'DEPT002', false, 20, true, '2026-03-19', '2026-03-19'),
('LAB_WEEK_2', 'Advanced Lab Test', 'فحص مخبري متقدم', 'LAB TEST', 'Advanced Diagnostics', 'Advanced lab test for Lab dept', 850000, 765000, 680000, 'DEPT002', false, 45, true, '2026-03-12', '2026-03-12'),
('LAB_WEEK_3', 'Genetic Testing', 'اختبار جيني', 'LAB TEST', 'Molecular Diagnostics', 'Genetic testing for Lab dept', 1200000, 1080000, 960000, 'DEPT002', false, 60, true, '2026-03-08', '2026-03-08')
ON CONFLICT (code) DO NOTHING;

-- Insert sample invoices for the date range March 2-5
INSERT INTO invoices (invoice_number, invoice_date, patient_id, patient_name, patient_name_ar, subtotal, discount_percentage, discount_amount, total_amount, insurance_company_id, insurance_coverage_amount, insurance_coverage_percentage, patient_responsibility, amount_paid, balance_due, status, payment_method, payment_date, notes, createdat, updatedat) VALUES
('INV-WEEK-002', '2026-03-19', 'PAT-WEEK-002', 'مريض الأسبوع 2', 'Week Patient 2', 520000, 0, 0, 520000, 'INS-WEEK-002', 468000, 90, 52000, 520000, 0, 'PAID', 'INSURANCE', '2026-03-19', 'Weekly lab test Tuesday', '2026-03-19', '2026-03-19'),
('INV-WEEK-003', '2026-03-20', 'PAT-WEEK-003', 'مريض الأسبوع 3', 'Week Patient 3', 22000000, 0, 0, 22000000, 'INS-WEEK-003', 19800000, 90, 2200000, 22000000, 0, 'PAID', 'BANK', '2026-03-20', 'Weekly surgery Wednesday', '2026-03-20', '2026-03-20'),
('INV-WEEK-004', '2026-03-21', 'PAT-WEEK-004', 'مريض الأسبوع 4', 'Week Patient 4', 1800000, 0, 0, 1800000, 'INS-WEEK-004', 1620000, 90, 180000, 1800000, 0, 'PAID', 'CASH', '2026-03-21', 'Weekly radiology Thursday', '2026-03-21', '2026-03-21')
ON CONFLICT (invoice_number) DO NOTHING;

-- Insert sample payroll transactions
INSERT INTO payroll_transactions (employee_id, period_id, transaction_type, amount, description, createdat, updatedat) VALUES
('EMP-LAB-001', '2026-03', 'EARNING', 35000000, 'Lab director salary - Lab dept', '2026-03-01', '2026-03-01'),
('EMP-LAB-002', '2026-03', 'EARNING', 28000000, 'Senior technician salary - Lab dept', '2026-03-01', '2026-03-01')
ON CONFLICT (employee_id, period_id, transaction_type) DO NOTHING;

-- Insert departments
INSERT INTO departments (departmentid, name, description, active, createdat, updatedat) VALUES
('DEPT001', 'General Medicine', 'General medical consultation and primary care', true, '2026-03-01', '2026-03-01'),
('DEPT002', 'Laboratory', 'Clinical laboratory and diagnostic testing', true, '2026-03-01', '2026-03-01'),
('DEPT003', 'Surgery', 'Surgical procedures and operations', true, '2026-03-01', '2026-03-01'),
('DEPT004', 'Radiology', 'Medical imaging and radiology services', true, '2026-03-01', '2026-03-01'),
('DEPT005', 'Pharmacy', 'Pharmaceutical services and medication dispensing', true, '2026-03-01', '2026-03-01')
ON CONFLICT (departmentid) DO NOTHING;

-- Verify data was inserted
SELECT '=== DATA INSERTED ===' as status;
SELECT category, COUNT(*) as count, SUM(price_self_pay + price_insurance + price_government) as revenue 
FROM services WHERE active = true GROUP BY category ORDER BY revenue DESC;

SELECT status, COUNT(*) as count, SUM(total_amount) as amount 
FROM invoices GROUP BY status ORDER BY status;

SELECT '=== READY FOR TESTING ===' as final_status;
