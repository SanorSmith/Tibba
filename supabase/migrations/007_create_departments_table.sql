-- Create departments table for hospital department management
-- This migration creates the departments table and imports existing data

-- Create departments table
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255),
  code VARCHAR(10) UNIQUE NOT NULL,
  description TEXT,
  head_of_department VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  location VARCHAR(255),
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON departments(is_active);

-- Insert existing departments data
-- Mapping from existing structure to new departments table
INSERT INTO departments (id, name, contact_email, contact_phone, location, is_active, created_at, updated_at)
SELECT 
    departmentid::uuid,
    name,
    email,
    phone,
    address,
    true, -- All existing departments are active
    createdat::timestamp,
    updatedat::timestamp
FROM (
    SELECT 
        '1c3320e0-bfab-45ea-89d0-ff85c9ee7cd3'::uuid as departmentid, 'Surgery', '+964-770-123-4572', 'surgery@tibbna.com', 'Building F, Floor 4', '2026-02-28 19:29:48.411979'::timestamp, '2026-02-28 19:29:48.411979'::timestamp
    UNION ALL SELECT '23811e67-e67f-41ac-9487-fa797bfd5d36'::uuid, 'Dermatology', '+6672000038', 'dermatology@tibbna.com', 'Building C, Floor 1, Ali''s hospital', '2025-12-23 11:22:53.27095'::timestamp, '2025-12-23 11:22:53.27095'::timestamp
    UNION ALL SELECT '4f8d4fdc-35b3-45ed-a3d8-0f72ae551c2e'::uuid, 'Pediatrics', '+6672000033', 'pediatrics@tibbna.com', 'Building A, floor 4, Ali''s Hospital', '2025-12-23 11:20:58.942131'::timestamp, '2025-12-23 11:20:58.942131'::timestamp
    UNION ALL SELECT '6151ac4b-ca80-4086-81b2-fe797fe22e58'::uuid, 'Radiology', '+6672000035', 'radiology@tibbna.com', 'Building A, Floor 2, Ali''s Hospital', '2025-12-23 11:22:03.069022'::timestamp, '2025-12-23 11:22:03.069022'::timestamp
    UNION ALL SELECT '65e20c68-2a02-4b10-88f5-ce0702d28541'::uuid, 'Laboratory', '+964-770-123-4571', 'lab@tibbna.com', 'Building E, Floor 1', '2026-02-28 19:29:48.351995'::timestamp, '2026-02-28 19:29:48.351995'::timestamp
    UNION ALL SELECT '6c3f1e4c-ab73-41f4-8c01-aea9e7626f1e'::uuid, 'Orthopedics', '+6672000022', 'orthopedics@tibbna.com', 'Building C, Floor 1, Ali''s Hospital', '2025-12-23 11:20:03.133827'::timestamp, '2025-12-23 11:20:03.133827'::timestamp
    UNION ALL SELECT '74a0dbb4-b757-4a70-88f6-842740f02485'::uuid, 'Pharmacy', '+964-770-123-4573', 'pharmacy@tibbna.com', 'Building G, Floor 1', '2026-02-28 19:29:48.472006'::timestamp, '2026-02-28 19:29:48.472006'::timestamp
    UNION ALL SELECT '96b8d449-a3a7-49e5-96d5-f8e64f6cfd9f'::uuid, 'Cardiology', '+964-770-123-4568', 'cardiology@tibbna.com', 'Building B, Floor 3', '2026-02-28 19:29:48.179697'::timestamp, '2026-02-28 19:29:48.179697'::timestamp
    UNION ALL SELECT 'a23c312a-ab3b-45af-86e0-1c8abde810ca'::uuid, 'Dermatology', '+6672000038', 'dermatology@tibbna.com', 'Building C, Floor 1, Ali''s hospital', '2025-12-23 11:22:54.019293'::timestamp, '2025-12-23 11:22:54.019293'::timestamp
    UNION ALL SELECT 'ace4e1b4-9b6c-409e-9c7c-dc612c11ccc1'::uuid, 'Pediatrics', '+964-770-123-4569', 'pediatrics@tibbna.com', 'Building C, Floor 2', '2026-02-28 19:29:48.233088'::timestamp, '2026-02-28 19:29:48.233088'::timestamp
    UNION ALL SELECT 'c8904a9c-5b6d-4fe4-9f37-c72c9b6b6408'::uuid, 'Cardialogy', '0700500010', 'cardialogy@tibbna.com', 'Building C, Ali''s Hospital', '2025-11-13 10:37:40.212999'::timestamp, '2025-11-13 10:37:40.212999'::timestamp
    UNION ALL SELECT 'e0695b95-07a5-40ab-9a15-4d3453cc47a7'::uuid, 'Radiology', '+964-770-123-4570', 'radiology@tibbna.com', 'Building D, Floor 1', '2026-02-28 19:29:48.292015'::timestamp, '2026-02-28 19:29:48.292015'::timestamp
    UNION ALL SELECT 'ee2f016e-8848-46e6-a8ed-048933274fd0'::uuid, 'Emergency Department', '+964-770-123-4567', 'emergency@tibbna.com', 'Building A, Floor 1', '2026-02-28 19:29:48.034144'::timestamp, '2026-02-28 19:29:48.034144'::timestamp
    UNION ALL SELECT 'f9d70f79-f006-4b42-a55a-922c5fd3a8cb'::uuid, 'Neurology', '+6672000000', 'neurology@tibbna.com', 'Building A, Floor 3, Ali''s Hospital', '2025-12-23 11:18:54.589918'::timestamp, '2025-12-23 11:18:54.589918'::timestamp
) AS existing_data
ON CONFLICT (id) DO NOTHING;

-- Generate department codes based on department names
UPDATE departments SET code = 
    CASE 
        WHEN name = 'Surgery' THEN 'SURG'
        WHEN name = 'Dermatology' THEN 'DERM'
        WHEN name = 'Pediatrics' THEN 'PED'
        WHEN name = 'Radiology' THEN 'RAD'
        WHEN name = 'Laboratory' THEN 'LAB'
        WHEN name = 'Orthopedics' THEN 'ORTHO'
        WHEN name = 'Pharmacy' THEN 'PHARM'
        WHEN name = 'Cardiology' THEN 'CARD'
        WHEN name = 'Cardialogy' THEN 'CARD2'
        WHEN name = 'Emergency Department' THEN 'ER'
        WHEN name = 'Neurology' THEN 'NEURO'
        ELSE UPPER(SUBSTRING(name, 1, 3))
    END
WHERE code IS NULL OR code = '';

-- Add Arabic names for common departments
UPDATE departments SET name_ar = 
    CASE 
        WHEN name = 'Surgery' THEN 'الجراحة'
        WHEN name = 'Dermatology' THEN 'الأمراض الجلدية'
        WHEN name = 'Pediatrics' THEN 'طب الأطفال'
        WHEN name = 'Radiology' THEN 'الأشعة'
        WHEN name = 'Laboratory' THEN 'المختبر'
        WHEN name = 'Orthopedics' THEN 'العظام'
        WHEN name = 'Pharmacy' THEN 'الصيدلية'
        WHEN name = 'Cardiology' THEN 'أمراض القلب'
        WHEN name = 'Emergency Department' THEN 'قسم الطوارئ'
        WHEN name = 'Neurology' THEN 'الأعصاب'
        ELSE NULL
    END
WHERE name_ar IS NULL OR name_ar = '';

-- Add descriptions for common departments
UPDATE departments SET description = 
    CASE 
        WHEN name = 'Surgery' THEN 'Surgical procedures and operations'
        WHEN name = 'Dermatology' THEN 'Skin care and dermatological treatments'
        WHEN name = 'Pediatrics' THEN 'Medical care for children and infants'
        WHEN name = 'Radiology' THEN 'Medical imaging and diagnostic services'
        WHEN name = 'Laboratory' THEN 'Laboratory testing and analysis'
        WHEN name = 'Orthopedics' THEN 'Bone and joint care'
        WHEN name = 'Pharmacy' THEN 'Medication dispensing and pharmaceutical services'
        WHEN name = 'Cardiology' THEN 'Heart and cardiovascular care'
        WHEN name = 'Emergency Department' THEN '24/7 emergency medical care'
        WHEN name = 'Neurology' THEN 'Nervous system and brain care'
        ELSE NULL
    END
WHERE description IS NULL OR description = '';

-- Set default capacities
UPDATE departments SET capacity = 
    CASE 
        WHEN name = 'Emergency Department' THEN 50
        WHEN name = 'Surgery' THEN 30
        WHEN name = 'Pediatrics' THEN 40
        WHEN name = 'Radiology' THEN 20
        WHEN name = 'Laboratory' THEN 15
        WHEN name = 'Pharmacy' THEN 10
        WHEN name = 'Cardiology' THEN 25
        ELSE 20
    END
WHERE capacity IS NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_departments_updated_at 
    BEFORE UPDATE ON departments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Departments are viewable by authenticated users" ON departments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Departments are insertable by authenticated users" ON departments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Departments are updatable by authenticated users" ON departments
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Departments are deletable by authenticated users" ON departments
    FOR DELETE USING (auth.role() = 'authenticated');
