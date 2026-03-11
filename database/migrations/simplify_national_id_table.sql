-- =====================================================
-- SIMPLIFY NATIONAL ID TABLE - ONLY ESSENTIAL FIELDS
-- Keep only national_id and staff_id connection
-- =====================================================

-- Drop the existing national_id table if it exists
DROP TABLE IF EXISTS national_id CASCADE;

-- Create simplified national_id table
CREATE TABLE IF NOT EXISTS national_id (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE ON UPDATE CASCADE,
    national_id VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE national_id IS 'Simple national identification table linked to staff';
COMMENT ON COLUMN national_id.id IS 'Primary key UUID';
COMMENT ON COLUMN national_id.staff_id IS 'Foreign key to staff table';
COMMENT ON COLUMN national_id.national_id IS 'National identification number, must be unique';
COMMENT ON COLUMN national_id.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN national_id.updated_at IS 'Record last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_national_id_staff_id ON national_id(staff_id);
CREATE INDEX IF NOT EXISTS idx_national_id_number ON national_id(national_id);

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
-- MIGRATE EXISTING DATA (if any exists)
-- =====================================================

-- Since we're simplifying, we don't need to migrate complex data
-- Just create the table structure ready for new data

-- =====================================================
-- CREATE SIMPLE VIEW FOR EASY ACCESS
-- =====================================================

CREATE OR REPLACE VIEW staff_with_national_id AS
SELECT 
    s.*,
    ni.national_id
FROM staff s
LEFT JOIN national_id ni ON s.staffid = ni.staff_id;

COMMENT ON VIEW staff_with_national_id IS 'Simple staff view with national ID joined';
