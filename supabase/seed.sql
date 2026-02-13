-- ============================================================================
-- TIBBNA-EHR SEED DATA: Organization + Departments + Demo Employees
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================================

-- 1. Create the default organization
INSERT INTO organizations (id, code, name, name_ar, type, license_number, active, address, contact)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TIBBNA-001',
  'Tibbna Hospital',
  'مستشفى تبنى',
  'HOSPITAL',
  'IQ-MOH-2024-001',
  true,
  '{"street": "Medical City Complex", "city": "Baghdad", "governorate": "Baghdad", "country": "Iraq"}'::jsonb,
  '{"phone": "+964-770-000-0001", "email": "admin@tibbna.com", "website": "https://tibbna.com"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create departments
INSERT INTO departments (id, organization_id, code, name, type, active) VALUES
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DEPT-ADMIN', 'Administration', 'ADMINISTRATIVE', true),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'DEPT-ER', 'Emergency Room', 'CLINICAL', true),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'DEPT-ICU', 'Intensive Care Unit', 'CLINICAL', true),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'DEPT-SURG', 'Surgery', 'CLINICAL', true),
('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'DEPT-PEDS', 'Pediatrics', 'CLINICAL', true),
('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'DEPT-FIN', 'Finance', 'ADMINISTRATIVE', true),
('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'DEPT-PHARM', 'Pharmacy', 'CLINICAL', true),
('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'DEPT-LAB', 'Laboratory', 'CLINICAL', true),
('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'DEPT-RAD', 'Radiology', 'CLINICAL', true),
('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'DEPT-NURS', 'Nursing', 'CLINICAL', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create demo employees with departments
INSERT INTO employees (
  organization_id, employee_number, first_name, last_name, email, phone,
  job_title, department_id, employment_type, employment_status,
  hire_date, salary_grade, base_salary, gender, nationality, active
) VALUES
-- Administration
('00000000-0000-0000-0000-000000000001', 'EMP-0001', 'Admin', 'User', 'admin@tibbna.com', '+964-770-000-0001', 'Hospital Administrator', '10000000-0000-0000-0000-000000000001', 'FULL_TIME', 'ACTIVE', '2020-01-01', 'G10', 5000000, 'MALE', 'Iraqi', true),
-- Emergency Room
('00000000-0000-0000-0000-000000000001', 'EMP-0002', 'Ahmed', 'Hassan', 'doctor@tibbna.com', '+964-770-000-0002', 'General Physician', '10000000-0000-0000-0000-000000000002', 'FULL_TIME', 'ACTIVE', '2021-03-15', 'G8', 3500000, 'MALE', 'Iraqi', true),
('00000000-0000-0000-0000-000000000001', 'EMP-0005', 'Mustafa', 'Ali', 'mustafa.ali@tibbna.com', '+964-770-000-0005', 'ER Doctor', '10000000-0000-0000-0000-000000000002', 'FULL_TIME', 'ACTIVE', '2022-06-01', 'G8', 3800000, 'MALE', 'Iraqi', true),
-- Nursing
('00000000-0000-0000-0000-000000000001', 'EMP-0003', 'Fatima', 'Ali', 'nurse@tibbna.com', '+964-770-000-0003', 'Head Nurse', '10000000-0000-0000-0000-000000000010', 'FULL_TIME', 'ACTIVE', '2021-06-01', 'G6', 2000000, 'FEMALE', 'Iraqi', true),
('00000000-0000-0000-0000-000000000001', 'EMP-0006', 'Zainab', 'Mohammed', 'zainab.mohammed@tibbna.com', '+964-770-000-0006', 'Senior Nurse', '10000000-0000-0000-0000-000000000010', 'FULL_TIME', 'ACTIVE', '2022-02-15', 'G6', 2200000, 'FEMALE', 'Iraqi', true),
('00000000-0000-0000-0000-000000000001', 'EMP-0007', 'Noor', 'Hussein', 'noor.hussein@tibbna.com', '+964-770-000-0007', 'ICU Nurse', '10000000-0000-0000-0000-000000000003', 'FULL_TIME', 'ACTIVE', '2023-01-10', 'G7', 2500000, 'FEMALE', 'Iraqi', true),
-- Finance
('00000000-0000-0000-0000-000000000001', 'EMP-0004', 'Omar', 'Ibrahim', 'billing@tibbna.com', '+964-770-000-0004', 'Billing Specialist', '10000000-0000-0000-0000-000000000006', 'FULL_TIME', 'ACTIVE', '2022-01-10', 'G5', 1500000, 'MALE', 'Iraqi', true),
('00000000-0000-0000-0000-000000000001', 'EMP-0008', 'Layla', 'Rashid', 'layla.rashid@tibbna.com', '+964-770-000-0008', 'Finance Manager', '10000000-0000-0000-0000-000000000006', 'FULL_TIME', 'ACTIVE', '2021-09-01', 'G8', 3000000, 'FEMALE', 'Iraqi', true),
-- ICU
('00000000-0000-0000-0000-000000000001', 'EMP-0009', 'Karim', 'Abdullah', 'karim.abdullah@tibbna.com', '+964-770-000-0009', 'Cardiologist', '10000000-0000-0000-0000-000000000003', 'FULL_TIME', 'ACTIVE', '2020-08-15', 'G9', 4200000, 'MALE', 'Iraqi', true),
-- Pharmacy
('00000000-0000-0000-0000-000000000001', 'EMP-0010', 'Sara', 'Ahmed', 'sara.ahmed@tibbna.com', '+964-770-000-0010', 'Chief Pharmacist', '10000000-0000-0000-0000-000000000007', 'FULL_TIME', 'ACTIVE', '2021-04-01', 'G7', 2800000, 'FEMALE', 'Iraqi', true)
ON CONFLICT (employee_number) DO NOTHING;

-- Verify
SELECT e.employee_number, e.first_name, e.last_name, e.email, e.job_title, d.name as department, e.salary_grade
FROM employees e
LEFT JOIN departments d ON e.department_id = d.id
WHERE e.active = true
ORDER BY e.employee_number;
