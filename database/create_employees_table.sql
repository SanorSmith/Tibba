-- =====================================================
-- EMPLOYEES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    employee_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name_arabic VARCHAR(200),
    date_of_birth DATE,
    gender VARCHAR(10) CHECK (gender IN ('MALE', 'FEMALE')),
    marital_status VARCHAR(20) CHECK (marital_status IN ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED')),
    nationality VARCHAR(50),
    national_id VARCHAR(20),
    email_work VARCHAR(100),
    phone_mobile VARCHAR(20),
    blood_type VARCHAR(5),
    
    -- Employment Information
    employment_type VARCHAR(20) CHECK (employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN')),
    employee_category VARCHAR(30) CHECK (employee_category IN ('MEDICAL_STAFF', 'NURSING', 'ADMINISTRATIVE', 'TECHNICAL', 'SUPPORT')),
    job_title VARCHAR(100),
    department_id VARCHAR(20),
    department_name VARCHAR(100),
    reporting_to VARCHAR(20),
    grade_id VARCHAR(10),
    
    -- Employment Status & Dates
    date_of_hire DATE,
    employment_status VARCHAR(20) CHECK (employment_status IN ('ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE')),
    basic_salary DECIMAL(12, 2),
    photo_url VARCHAR(200),
    
    -- System Fields
    organization_id UUID DEFAULT '00000000-0000-0000-0000-000000000001',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT employees_employee_id_check CHECK (employee_id ~ '^EMP-\d{4}-\d{3}$'),
    CONSTRAINT employees_reporting_to_fkey FOREIGN KEY (reporting_to) REFERENCES employees(employee_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employment_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_organization_id ON employees(organization_id);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employees_updated_at 
    BEFORE UPDATE ON employees 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE employees IS 'Core employee information for hospital HR system';
COMMENT ON COLUMN employees.id IS 'Primary key UUID';
COMMENT ON COLUMN employees.employee_id IS 'Business identifier (e.g., EMP-2024-001)';
COMMENT ON COLUMN employees.reporting_to IS 'Self-referencing foreign key for manager hierarchy';
COMMENT ON COLUMN employees.organization_id IS 'Multi-tenant organization identifier';
