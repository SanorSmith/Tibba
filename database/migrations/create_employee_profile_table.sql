-- =====================================================
-- CREATE EMPLOYEE_PROFILE TABLE FOR EMPLOYEE PROFILE FORM FIELDS
-- Connects all Employee Profile form fields to staff table
-- =====================================================

CREATE TABLE IF NOT EXISTS employee_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(staffid) ON DELETE CASCADE ON UPDATE CASCADE,
    
    -- Professional Summary
    cv_summary TEXT,
    
    -- Education (JSON array of education objects)
    education JSONB DEFAULT '[]'::jsonb,
    
    -- Work History (JSON array of work history objects)  
    work_history JSONB DEFAULT '[]'::jsonb,
    
    -- Certifications (JSON array of certification objects)
    certifications JSONB DEFAULT '[]'::jsonb,
    
    -- Languages (JSON array of language objects)
    languages JSONB DEFAULT '[]'::jsonb,
    
    -- Skills (JSON array of skill objects)
    skills JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    profile_completed BOOLEAN DEFAULT false,
    profile_completion_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE employee_profile IS 'Employee profile information from Employee Profile form - CV, education, work history, certifications, languages, and skills';

COMMENT ON COLUMN employee_profile.id IS 'Primary key UUID';
COMMENT ON COLUMN employee_profile.staff_id IS 'Foreign key to staff table';
COMMENT ON COLUMN employee_profile.cv_summary IS 'Professional summary or career objective from CV';
COMMENT ON COLUMN employee_profile.education IS 'Educational qualifications in JSON format: [{degree, institution, field_of_study, graduation_year, gpa}]';
COMMENT ON COLUMN employee_profile.work_history IS 'Work experience in JSON format: [{company, position, start_date, end_date, description}]';
COMMENT ON COLUMN employee_profile.certifications IS 'Professional certifications in JSON format: [{name, issuing_organization, issue_date, expiry_date, credential_id}]';
COMMENT ON COLUMN employee_profile.languages IS 'Languages spoken in JSON format: [{language, proficiency}]';
COMMENT ON COLUMN employee_profile.skills IS 'Professional skills in JSON format: [{skill, proficiency_level}]';
COMMENT ON COLUMN employee_profile.profile_completed IS 'Whether the employee profile section is fully completed';
COMMENT ON COLUMN employee_profile.profile_completion_date IS 'Date when profile was marked as completed';
COMMENT ON COLUMN employee_profile.created_at IS 'Record creation timestamp';
COMMENT ON COLUMN employee_profile.updated_at IS 'Record last update timestamp';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_profile_staff_id ON employee_profile(staff_id);
CREATE INDEX IF NOT EXISTS idx_employee_profile_completed ON employee_profile(profile_completed);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_employee_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_employee_profile_updated_at 
    BEFORE UPDATE ON employee_profile 
    FOR EACH ROW EXECUTE FUNCTION update_employee_profile_updated_at();

-- =====================================================
-- UPDATE COMPREHENSIVE VIEW TO INCLUDE EMPLOYEE_PROFILE
-- =====================================================

DROP VIEW IF EXISTS staff_complete;

CREATE OR REPLACE VIEW staff_complete AS
SELECT 
    s.*,
    ed.job_title,
    ed.department_id,
    ed.employee_category,
    ed.employment_type,
    ed.date_of_hire,
    ed.grade_id,
    ed.basic_salary,
    ed.shift_id,
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
    ep.cv_summary,
    ep.education,
    ep.work_history,
    ep.certifications,
    ep.languages,
    ep.skills,
    ep.profile_completed,
    ep.profile_completion_date,
    ni.national_id
FROM staff s
LEFT JOIN employment_details ed ON s.staffid = ed.staff_id
LEFT JOIN settlement_rules sr ON s.staffid = sr.staff_id
LEFT JOIN bank_details bd ON s.staffid = bd.staff_id
LEFT JOIN employee_profile ep ON s.staffid = ep.staff_id
LEFT JOIN national_id ni ON s.staffid = ni.staff_id;

COMMENT ON VIEW staff_complete IS 'Complete staff information with all related tables including employee profile';
