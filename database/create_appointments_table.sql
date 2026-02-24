-- Create appointments table for tibbna-hospital
-- Based on the tibbna repository appointments schema

-- Create enum types for appointments
CREATE TYPE appointment_status AS ENUM (
  'scheduled',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE appointment_name AS ENUM (
  'new_patient',
  're_visit',
  'follow_up'
);

CREATE TYPE appointment_type AS ENUM (
  'visiting',
  'video_call',
  'home_visit'
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES tibbna_openehr_patients(patient_id) ON DELETE CASCADE,
  doctor_id VARCHAR(255), -- Can reference staff or be a simple identifier
  appointment_name appointment_name NOT NULL DEFAULT 'new_patient',
  appointment_type appointment_type NOT NULL DEFAULT 'visiting',
  clinical_indication TEXT,
  reason_for_request TEXT,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  unit TEXT, -- department where the appointment will take place
  status appointment_status NOT NULL DEFAULT 'scheduled',
  notes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created_at ON appointments(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_appointments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_appointments_updated_at();

-- Add some sample data for testing
INSERT INTO appointments (
  patient_id,
  doctor_id,
  appointment_name,
  appointment_type,
  clinical_indication,
  start_time,
  end_time,
  location,
  unit,
  status
) VALUES (
  (SELECT patient_id FROM tibbna_openehr_patients LIMIT 1),
  'DR001',
  'new_patient',
  'visiting',
  'General checkup',
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '1 day' + INTERVAL '45 minutes',
  'Room 101',
  'General Medicine',
  'scheduled'
) ON CONFLICT DO NOTHING;

COMMENT ON TABLE appointments IS 'Stores patient appointments with doctors';
COMMENT ON COLUMN appointments.appointment_id IS 'Unique identifier for the appointment';
COMMENT ON COLUMN appointments.patient_id IS 'Reference to the patient';
COMMENT ON COLUMN appointments.doctor_id IS 'Identifier for the doctor';
COMMENT ON COLUMN appointments.appointment_name IS 'Type of appointment (new_patient, re_visit, follow_up)';
COMMENT ON COLUMN appointments.appointment_type IS 'Mode of appointment (visiting, video_call, home_visit)';
COMMENT ON COLUMN appointments.clinical_indication IS 'Clinical reason for the appointment';
COMMENT ON COLUMN appointments.start_time IS 'Appointment start time';
COMMENT ON COLUMN appointments.end_time IS 'Appointment end time';
COMMENT ON COLUMN appointments.location IS 'Physical location of the appointment';
COMMENT ON COLUMN appointments.unit IS 'Department or unit where appointment takes place';
COMMENT ON COLUMN appointments.status IS 'Current status of the appointment';
COMMENT ON COLUMN appointments.notes IS 'Additional notes in JSON format';
