-- =====================================================
-- ADD MISSING PERSONAL INFORMATION FIELDS TO STAFF TABLE
-- This migration adds fields needed by the Personal Information form
-- =====================================================

-- Personal Details
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender VARCHAR(20) CHECK (gender IN ('MALE', 'FEMALE'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20) CHECK (marital_status IN ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'));
ALTER TABLE staff ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Iraqi';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS national_id VARCHAR(50) UNIQUE;

-- Address Information
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address TEXT;

-- Emergency Contact Information
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN staff.gender IS 'Employee gender: MALE or FEMALE';
COMMENT ON COLUMN staff.marital_status IS 'Marital status: SINGLE, MARRIED, DIVORCED, or WIDOWED';
COMMENT ON COLUMN staff.nationality IS 'Country of nationality, defaults to Iraqi';
COMMENT ON COLUMN staff.national_id IS 'National identification number, must be unique';
COMMENT ON COLUMN staff.address IS 'Residential address';
COMMENT ON COLUMN staff.emergency_contact_name IS 'Name of emergency contact person';
COMMENT ON COLUMN staff.emergency_contact_phone IS 'Phone number of emergency contact';
COMMENT ON COLUMN staff.emergency_contact_relationship IS 'Relationship to emergency contact (e.g., Spouse, Parent)';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_gender ON staff(gender);
CREATE INDEX IF NOT EXISTS idx_staff_marital_status ON staff(marital_status);
CREATE INDEX IF NOT EXISTS idx_staff_nationality ON staff(nationality);
CREATE INDEX IF NOT EXISTS idx_staff_national_id ON staff(national_id);
