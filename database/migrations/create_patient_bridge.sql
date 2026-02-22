-- Patient Bridge Table - Links Finance System to OpenEHR Patients
-- This table stores references to patients from the Tibbna OpenEHR database
-- while keeping all finance data in the Supabase database

CREATE TABLE IF NOT EXISTS patient_bridge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  openehr_patient_id VARCHAR(255) NOT NULL UNIQUE, -- References patientid from OpenEHR DB
  openehr_patient_number VARCHAR(100), -- References patient_number from OpenEHR DB
  openehr_workspace_id VARCHAR(255), -- References workspaceid from OpenEHR DB
  patient_name_ar VARCHAR(255) NOT NULL,
  patient_name_en VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  national_id VARCHAR(100),
  governorate VARCHAR(255),
  date_of_birth DATE,
  gender VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_bridge_openehr_id ON patient_bridge(openehr_patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_bridge_phone ON patient_bridge(phone);

-- RLS policies (if you're using Row Level Security)
ALTER TABLE patient_bridge ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read patient data (for finance operations)
CREATE POLICY "Anyone can read patient bridge data" ON patient_bridge
  FOR SELECT USING (true);

-- Policy: Anyone can insert patient bridge data (for patient creation)
CREATE POLICY "Anyone can insert patient bridge data" ON patient_bridge
  FOR INSERT WITH CHECK (true);

-- Policy: Anyone can update patient bridge data
CREATE POLICY "Anyone can update patient bridge data" ON patient_bridge
  FOR UPDATE USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_patient_bridge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER patient_bridge_updated_at
  BEFORE UPDATE ON patient_bridge
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_bridge_updated_at();
