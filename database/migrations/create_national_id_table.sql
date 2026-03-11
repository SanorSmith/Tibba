-- =====================================================
-- CREATE NATIONAL ID TABLE WITH FOREIGN KEY TO STAFF
-- This separates national ID data for better security and normalization
-- =====================================================

-- Create national_id table
CREATE TABLE IF NOT EXISTS national_id (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE ON UPDATE CASCADE,
    national_id VARCHAR(50) UNIQUE NOT NULL,
    issuing_country VARCHAR(100) DEFAULT 'Iraq',
    issue_date DATE,
    expiry_date DATE,
    id_type VARCHAR(50) DEFAULT 'NATIONAL' CHECK (id_type IN ('NATIONAL', 'PASSPORT', 'RESIDENCE', 'OTHER')),
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

-- Add comments for documentation
COMMENT ON TABLE national_id IS 'National identification information separate from staff for security and normalization';
COMMENT ON COLUMN national_id.id IS 'Primary key UUID';
COMMENT ON COLUMN national_id.staff_id IS 'Foreign key to staff table';
COMMENT ON COLUMN national_id.national_id IS 'National identification number, must be unique across all records';
COMMENT ON COLUMN national_id.issuing_country IS 'Country that issued the ID';
COMMENT ON COLUMN national_id.issue_date IS 'Date when ID was issued';
COMMENT ON COLUMN national_id.expiry_date IS 'Date when ID expires (if applicable)';
COMMENT ON COLUMN national_id.id_type IS 'Type of identification document';
COMMENT ON COLUMN national_id.is_verified IS 'Whether the ID has been verified';
COMMENT ON COLUMN national_id.verification_date IS 'Date when ID was verified';
COMMENT ON COLUMN national_id.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN national_id.updated_at IS 'Record last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_national_id_staff_id ON national_id(staff_id);
CREATE INDEX IF NOT EXISTS idx_national_id_number ON national_id(national_id);
CREATE INDEX IF NOT EXISTS idx_national_id_country ON national_id(issuing_country);
CREATE INDEX IF NOT EXISTS idx_national_id_verified ON national_id(is_verified);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_national_id_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_national_id_updated_at 
    BEFORE UPDATE ON national_id 
    FOR EACH ROW EXECUTE FUNCTION update_national_id_updated_at();

-- =====================================================
-- MIGRATE EXISTING NATIONAL_ID DATA FROM STAFF TABLE
-- =====================================================

-- Move existing national_id data from staff to national_id table
INSERT INTO national_id (staff_id, national_id, issuing_country, is_verified)
SELECT 
    staffid as staff_id,
    national_id,
    nationality as issuing_country,
    true as is_verified
FROM staff 
WHERE national_id IS NOT NULL AND national_id != ''
ON CONFLICT (national_id) DO NOTHING;

-- =====================================================
-- REMOVE NATIONAL_ID COLUMN FROM STAFF TABLE
-- =====================================================

-- Drop the national_id column from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS national_id;

-- =====================================================
-- CREATE VIEW FOR EASY ACCESS TO STAFF WITH NATIONAL ID
-- =====================================================

CREATE OR REPLACE VIEW staff_with_national_id AS
SELECT 
    s.*,
    ni.national_id,
    ni.issuing_country as national_id_country,
    ni.issue_date as national_id_issue_date,
    ni.expiry_date as national_id_expiry_date,
    ni.id_type as national_id_type,
    ni.is_verified as national_id_verified,
    ni.verification_date as national_id_verification_date
FROM staff s
LEFT JOIN national_id ni ON s.staffid = ni.staff_id;

COMMENT ON VIEW staff_with_national_id IS 'Staff view with national ID information joined for easy access';
