-- ============================================================
-- Create Patients Table (if not exists) for Local Testing
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create patients table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  gender VARCHAR(20),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add test patient
INSERT INTO public.patients (
  first_name,
  last_name,
  date_of_birth,
  gender,
  phone,
  email,
  address,
  city,
  country
) VALUES (
  'Test',
  'Patient',
  '1990-01-01',
  'MALE',
  '+964123456789',
  'test.patient@example.com',
  'Test Address',
  'Baghdad',
  'Iraq'
) ON CONFLICT DO NOTHING;

-- Verify the patient was created
SELECT id, first_name, last_name, gender, phone FROM public.patients WHERE first_name = 'Test' AND last_name = 'Patient';
