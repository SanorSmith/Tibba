-- Professional Database Migration: Add Department Foreign Key to Services Table
-- This script ensures proper referential integrity between services and departments

-- Migration: 001_add_services_department_fk
-- Created: 2026-03-23
-- Purpose: Connect services table with departments table via foreign key constraint

-- Start transaction
BEGIN;

-- 1. Check if services table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'services'
    ) THEN
        RAISE EXCEPTION 'Services table does not exist. Please create services table first.';
    END IF;
END $$;

-- 2. Check if departments table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'departments'
    ) THEN
        RAISE EXCEPTION 'Departments table does not exist. Please create departments table first.';
    END IF;
END $$;

-- 3. Add department_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'department_id'
    ) THEN
        ALTER TABLE services ADD COLUMN department_id VARCHAR(50);
        RAISE NOTICE 'Added department_id column to services table';
    ELSE
        RAISE NOTICE 'department_id column already exists in services table';
    END IF;
END $$;

-- 4. Add provider-related columns if they don't exist (for completeness)
DO $$
BEGIN
    -- provider_id column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'provider_id'
    ) THEN
        ALTER TABLE services ADD COLUMN provider_id VARCHAR(50);
        RAISE NOTICE 'Added provider_id column to services table';
    END IF;

    -- provider_name column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'provider_name'
    ) THEN
        ALTER TABLE services ADD COLUMN provider_name VARCHAR(255);
        RAISE NOTICE 'Added provider_name column to services table';
    END IF;

    -- service_fee column
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'services' 
        AND column_name = 'service_fee'
    ) THEN
        ALTER TABLE services ADD COLUMN service_fee NUMERIC(12,2) DEFAULT 0;
        RAISE NOTICE 'Added service_fee column to services table';
    END IF;
END $$;

-- 5. Create index on department_id for better performance
CREATE INDEX IF NOT EXISTS idx_services_department_id ON services(department_id);

-- 6. Add foreign key constraint (only if no existing constraint)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_usage cu ON tc.constraint_name = cu.constraint_name
        WHERE tc.table_name = 'services' 
        AND tc.constraint_name = 'fk_services_department'
        AND tc.constraint_type = 'FOREIGN KEY'
    ) THEN
        ALTER TABLE services 
        ADD CONSTRAINT fk_services_department 
        FOREIGN KEY (department_id) REFERENCES departments(departmentid)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key constraint fk_services_department';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_services_department already exists';
    END IF;
END $$;

-- 7. Create a view for services with department names (for easier reporting)
CREATE OR REPLACE VIEW services_with_department AS
SELECT 
    s.id,
    s.code,
    s.name,
    s.name_ar,
    s.category,
    s.subcategory,
    s.description,
    s.price_self_pay,
    s.price_insurance,
    s.price_government,
    s.department_id,
    d.name as department_name,
    d.description as department_description,
    s.requires_appointment,
    s.duration_minutes,
    s.provider_id,
    s.provider_name,
    s.service_fee,
    s.active,
    s.createdat,
    s.updatedat
FROM services s
LEFT JOIN departments d ON s.department_id = d.departmentid;

-- 8. Grant permissions (adjust based on your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON services TO your_app_user;
-- GRANT SELECT ON services_with_department TO your_app_user;
-- GRANT SELECT ON departments TO your_app_user;

-- Commit transaction
COMMIT;

-- Verification queries
-- \d services  -- Check table structure
-- \d departments  -- Check departments table structure
-- SELECT * FROM services_with_department LIMIT 5;  -- Test the view

RAISE NOTICE 'Migration completed successfully!';
RAISE NOTICE 'Services table is now properly connected to departments table.';
RAISE NOTICE 'View "services_with_department" is available for reporting.';
