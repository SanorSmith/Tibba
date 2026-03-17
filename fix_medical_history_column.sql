-- Fix medical history column to accept plain text instead of JSON
-- This script changes the medicalhistory column from JSONB to TEXT

-- 1. Change column type in patient_medical_information table
ALTER TABLE patient_medical_information 
ALTER COLUMN medicalhistory TYPE TEXT USING medicalhistory::TEXT;

-- 2. Update existing JSON data to empty string or null
UPDATE patient_medical_information 
SET medicalhistory = NULL 
WHERE medicalhistory = '{}' 
   OR medicalhistory = '{"allergies":[],"conditions":[],"medications":[]}'
   OR medicalhistory = '';

-- 3. Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patient_medical_information' 
  AND column_name = 'medicalhistory';

-- 4. Show sample data
SELECT patientid, medicalhistory, pg_typeof(medicalhistory) as data_type
FROM patient_medical_information
LIMIT 5;
