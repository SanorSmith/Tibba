-- =====================================================
-- CREATE SEPARATE TABLES FOR EMPLOYEE DATA
-- Employment, Settlement Rules, Bank Details, and Profile tables
-- All connected to staff table with foreign keys
-- =====================================================

-- 1. EMPLOYMENT TABLE
CREATE TABLE IF NOT EXISTS employment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE ON UPDATE CASCADE,
    job_title TEXT,
    department_id TEXT,
    employee_category TEXT,
    employment_type TEXT,
    date_of_hire DATE,
    grade_id TEXT,
    basic_salary DECIMAL(15,2),
    shift_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. SETTLEMENT RULES TABLE
CREATE TABLE IF NOT EXISTS settlement_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE ON UPDATE CASCADE,
    pension_eligible BOOLEAN DEFAULT true,
    pension_scheme VARCHAR DEFAULT 'STANDARD',
    pension_start_date DATE,
    pension_contribution_rate NUMERIC DEFAULT 5.00,
    employer_pension_rate NUMERIC DEFAULT 5.00,
    social_security_number VARCHAR,
    social_security_rate NUMERIC DEFAULT 5.00,
    tax_id_number VARCHAR,
    tax_exemption_amount NUMERIC DEFAULT 0,
    settlement_eligible BOOLEAN DEFAULT true,
    settlement_calculation_method VARCHAR DEFAULT 'IRAQI_LABOR_LAW',
    notice_period_days INTEGER DEFAULT 30,
    gratuity_eligible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BANK DETAILS TABLE
CREATE TABLE IF NOT EXISTS bank_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE ON UPDATE CASCADE,
    bank_name TEXT,
    bank_account_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. PROFILE TABLE
CREATE TABLE IF NOT EXISTS profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE ON UPDATE CASCADE,
    cv_summary TEXT,
    education JSONB DEFAULT '[]'::jsonb,
    work_history JSONB DEFAULT '[]'::jsonb,
    certifications JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    profile_completed BOOLEAN DEFAULT false,
    profile_completion_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE employment IS 'Employment details for staff members';
COMMENT ON TABLE settlement_rules IS 'Pension, tax, and settlement rules for staff';
COMMENT ON TABLE bank_details IS 'Bank account information for salary deposits';
COMMENT ON TABLE profile IS 'Professional profile including education, work history, certifications, languages, and skills';

-- Employment table comments
COMMENT ON COLUMN employment.staff_id IS 'Foreign key to staff table';
COMMENT ON COLUMN employment.job_title IS 'Employee job title or position';
COMMENT ON COLUMN employment.department_id IS 'Department identifier';
COMMENT ON COLUMN employment.employee_category IS 'Employee category: DOCTOR, NURSE, etc.';
COMMENT ON COLUMN employment.employment_type IS 'Employment type: FULL_TIME, PART_TIME, etc.';
COMMENT ON COLUMN employment.date_of_hire IS 'Date when employee was hired';
COMMENT ON COLUMN employment.grade_id IS 'Salary grade identifier';
COMMENT ON COLUMN employment.basic_salary IS 'Monthly basic salary';
COMMENT ON COLUMN employment.shift_id IS 'Shift pattern identifier';

-- Settlement rules table comments
COMMENT ON COLUMN settlement_rules.staff_id IS 'Foreign key to staff table';
COMMENT ON COLUMN settlement_rules.pension_eligible IS 'Whether employee is eligible for pension';
COMMENT ON COLUMN settlement_rules.pension_scheme IS 'Type of pension scheme';
COMMENT ON COLUMN settlement_rules.pension_start_date IS 'Date when pension contributions start';
COMMENT ON COLUMN settlement_rules.pension_contribution_rate IS 'Employee pension contribution percentage';
COMMENT ON COLUMN settlement_rules.employer_pension_rate IS 'Employer pension contribution percentage';
COMMENT ON COLUMN settlement_rules.social_security_number IS 'Social security identification number';
COMMENT ON COLUMN settlement_rules.social_security_rate IS 'Social security contribution rate';
COMMENT ON COLUMN settlement_rules.tax_id_number IS 'Tax identification number';
COMMENT ON COLUMN settlement_rules.tax_exemption_amount IS 'Monthly tax exemption amount';
COMMENT ON COLUMN settlement_rules.settlement_eligible IS 'Eligibility for end-of-service settlement';
COMMENT ON COLUMN settlement_rules.settlement_calculation_method IS 'Method for calculating settlement';
COMMENT ON COLUMN settlement_rules.notice_period_days IS 'Required notice period in days';
COMMENT ON COLUMN settlement_rules.gratuity_eligible IS 'Eligibility for gratuity payments';

-- Bank details table comments
COMMENT ON COLUMN bank_details.staff_id IS 'Foreign key to staff table';
COMMENT ON COLUMN bank_details.bank_name IS 'Name of bank for salary deposits';
COMMENT ON COLUMN bank_details.bank_account_number IS 'Bank account number';

-- Profile table comments
COMMENT ON COLUMN profile.staff_id IS 'Foreign key to staff table';
COMMENT ON COLUMN profile.cv_summary IS 'Professional summary or CV overview';
COMMENT ON COLUMN profile.education IS 'Educational background in JSON format';
COMMENT ON COLUMN profile.work_history IS 'Work experience in JSON format';
COMMENT ON COLUMN profile.certifications IS 'Professional certifications in JSON format';
COMMENT ON COLUMN profile.languages IS 'Languages known in JSON format';
COMMENT ON COLUMN profile.skills IS 'Professional skills in JSON format';
COMMENT ON COLUMN profile.profile_completed IS 'Whether profile is fully completed';
COMMENT ON COLUMN profile.profile_completion_date IS 'Date when profile was completed';

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Employment indexes
CREATE INDEX IF NOT EXISTS idx_employment_staff_id ON employment(staff_id);
CREATE INDEX IF NOT EXISTS idx_employment_department_id ON employment(department_id);
CREATE INDEX IF NOT EXISTS idx_employment_employee_category ON employment(employee_category);
CREATE INDEX IF NOT EXISTS idx_employment_grade_id ON employment(grade_id);

-- Settlement rules indexes
CREATE INDEX IF NOT EXISTS idx_settlement_rules_staff_id ON settlement_rules(staff_id);
CREATE INDEX IF NOT EXISTS idx_settlement_rules_pension_scheme ON settlement_rules(pension_scheme);
CREATE INDEX IF NOT EXISTS idx_settlement_rules_settlement_eligible ON settlement_rules(settlement_eligible);

-- Bank details indexes
CREATE INDEX IF NOT EXISTS idx_bank_details_staff_id ON bank_details(staff_id);
CREATE INDEX IF NOT EXISTS idx_bank_details_bank_name ON bank_details(bank_name);

-- Profile indexes
CREATE INDEX IF NOT EXISTS idx_profile_staff_id ON profile(staff_id);
CREATE INDEX IF NOT EXISTS idx_profile_completed ON profile(profile_completed);

-- =====================================================
-- CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_employment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employment_updated_at 
    BEFORE UPDATE ON employment 
    FOR EACH ROW EXECUTE FUNCTION update_employment_updated_at();

CREATE OR REPLACE FUNCTION update_settlement_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_settlement_rules_updated_at 
    BEFORE UPDATE ON settlement_rules 
    FOR EACH ROW EXECUTE FUNCTION update_settlement_rules_updated_at();

CREATE OR REPLACE FUNCTION update_bank_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_details_updated_at 
    BEFORE UPDATE ON bank_details 
    FOR EACH ROW EXECUTE FUNCTION update_bank_details_updated_at();

CREATE OR REPLACE FUNCTION update_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profile_updated_at 
    BEFORE UPDATE ON profile 
    FOR EACH ROW EXECUTE FUNCTION update_profile_updated_at();

-- =====================================================
-- CREATE COMPREHENSIVE VIEW FOR EASY ACCESS
-- =====================================================

CREATE OR REPLACE VIEW staff_complete AS
SELECT 
    s.*,
    e.job_title,
    e.department_id,
    e.employee_category,
    e.employment_type,
    e.date_of_hire,
    e.grade_id,
    e.basic_salary,
    e.shift_id,
    sr.pension_eligible,
    sr.pension_scheme,
    sr.pension_start_date,
    sr.pension_contribution_rate,
    sr.employer_pension_rate,
    sr.social_security_number,
    sr.social_security_rate,
    sr.tax_id_number,
    sr.tax_exemption_amount,
    sr.settlement_eligible,
    sr.settlement_calculation_method,
    sr.notice_period_days,
    sr.gratuity_eligible,
    bd.bank_name,
    bd.bank_account_number,
    p.cv_summary,
    p.education,
    p.work_history,
    p.certifications,
    p.languages,
    p.skills,
    p.profile_completed,
    p.profile_completion_date,
    ni.national_id
FROM staff s
LEFT JOIN employment e ON s.staffid = e.staff_id
LEFT JOIN settlement_rules sr ON s.staffid = sr.staff_id
LEFT JOIN bank_details bd ON s.staffid = bd.staff_id
LEFT JOIN profile p ON s.staffid = p.staff_id
LEFT JOIN national_id ni ON s.staffid = ni.staff_id;

COMMENT ON VIEW staff_complete IS 'Complete staff information with all related tables joined';
