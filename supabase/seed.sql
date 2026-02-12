-- ============================================================================
-- TIBBNA-EHR SEED DATA: Organization + Demo Users
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

-- 2. Create demo login users
INSERT INTO employees (
  organization_id,
  employee_number,
  first_name,
  last_name,
  email,
  job_title,
  employment_type,
  employment_status,
  hire_date,
  salary_grade,
  base_salary,
  active
) VALUES
('00000000-0000-0000-0000-000000000001', 'EMP-0001', 'Admin', 'User', 'admin@tibbna.com', 'Hospital Administrator', 'FULL_TIME', 'ACTIVE', '2020-01-01', 'G10', 5000000, true),
('00000000-0000-0000-0000-000000000001', 'EMP-0002', 'Ahmed', 'Hassan', 'doctor@tibbna.com', 'General Physician', 'FULL_TIME', 'ACTIVE', '2021-03-15', 'G8', 3500000, true),
('00000000-0000-0000-0000-000000000001', 'EMP-0003', 'Fatima', 'Ali', 'nurse@tibbna.com', 'Head Nurse', 'FULL_TIME', 'ACTIVE', '2021-06-01', 'G6', 2000000, true),
('00000000-0000-0000-0000-000000000001', 'EMP-0004', 'Omar', 'Ibrahim', 'billing@tibbna.com', 'Billing Specialist', 'FULL_TIME', 'ACTIVE', '2022-01-10', 'G5', 1500000, true)
ON CONFLICT (employee_number) DO NOTHING;
