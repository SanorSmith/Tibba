-- ============================================================
-- Add Test Patient for Service Share Payment Testing
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create a test patient in the local database for testing
INSERT INTO public.patients (
  id,
  first_name,
  last_name,
  date_of_birth,
  gender,
  phone,
  email,
  address,
  city,
  country,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test',
  'Patient',
  '1990-01-01',
  'MALE',
  '+964123456789',
  'test.patient@example.com',
  'Test Address',
  'Baghdad',
  'Iraq',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;

-- Verify the patient was created
SELECT id, first_name, last_name, gender, phone FROM public.patients WHERE first_name = 'Test' AND last_name = 'Patient';
