-- =====================================================
-- RENAME employment TABLE TO employment_details
-- =====================================================

-- Drop the existing view first
DROP VIEW IF EXISTS staff_complete;

-- Rename the table
ALTER TABLE employment RENAME TO employment_details;

-- Update the comprehensive view with the new table name
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
LEFT JOIN employment_details ed ON s.staffid = ed.staff_id
LEFT JOIN settlement_rules sr ON s.staffid = sr.staff_id
LEFT JOIN bank_details bd ON s.staffid = bd.staff_id
LEFT JOIN profile p ON s.staffid = p.staff_id
LEFT JOIN national_id ni ON s.staffid = ni.staff_id;

COMMENT ON VIEW staff_complete IS 'Complete staff information with all related tables joined';
