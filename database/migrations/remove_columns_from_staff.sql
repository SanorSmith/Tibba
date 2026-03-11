-- =====================================================
-- REMOVE COLUMNS FROM STAFF TABLE THAT WILL BE MOVED TO SEPARATE TABLES
-- =====================================================

-- Drop dependent views first
DROP VIEW IF EXISTS staff_with_national_id;
DROP VIEW IF EXISTS staff_complete;

-- Remove Employment columns from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS job_title;
ALTER TABLE staff DROP COLUMN IF EXISTS department_id;
ALTER TABLE staff DROP COLUMN IF EXISTS employee_category;
ALTER TABLE staff DROP COLUMN IF EXISTS employment_type;
ALTER TABLE staff DROP COLUMN IF EXISTS date_of_hire;
ALTER TABLE staff DROP COLUMN IF EXISTS grade_id;
ALTER TABLE staff DROP COLUMN IF EXISTS basic_salary;
ALTER TABLE staff DROP COLUMN IF EXISTS shift_id;

-- Remove Settlement Rules columns from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS pension_eligible;
ALTER TABLE staff DROP COLUMN IF EXISTS pension_scheme;
ALTER TABLE staff DROP COLUMN IF EXISTS pension_start_date;
ALTER TABLE staff DROP COLUMN IF EXISTS pension_contribution_rate;
ALTER TABLE staff DROP COLUMN IF EXISTS employer_pension_rate;
ALTER TABLE staff DROP COLUMN IF EXISTS social_security_number;
ALTER TABLE staff DROP COLUMN IF EXISTS social_security_rate;
ALTER TABLE staff DROP COLUMN IF EXISTS tax_id_number;
ALTER TABLE staff DROP COLUMN IF EXISTS tax_exemption_amount;
ALTER TABLE staff DROP COLUMN IF EXISTS settlement_eligible;
ALTER TABLE staff DROP COLUMN IF EXISTS settlement_calculation_method;
ALTER TABLE staff DROP COLUMN IF EXISTS notice_period_days;
ALTER TABLE staff DROP COLUMN IF EXISTS gratuity_eligible;
ALTER TABLE staff DROP COLUMN IF EXISTS last_settlement_date;
ALTER TABLE staff DROP COLUMN IF EXISTS last_settlement_amount;

-- Remove Bank Details columns from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS bank_name;
ALTER TABLE staff DROP COLUMN IF EXISTS bank_account_number;

-- Remove Profile columns from staff table
ALTER TABLE staff DROP COLUMN IF EXISTS cv_summary;
ALTER TABLE staff DROP COLUMN IF EXISTS cv_file_url;
ALTER TABLE staff DROP COLUMN IF EXISTS education;
ALTER TABLE staff DROP COLUMN IF EXISTS work_history;
ALTER TABLE staff DROP COLUMN IF EXISTS certifications;
ALTER TABLE staff DROP COLUMN IF EXISTS languages;
ALTER TABLE staff DROP COLUMN IF EXISTS skills;
ALTER TABLE staff DROP COLUMN IF EXISTS attachments;
ALTER TABLE staff DROP COLUMN IF EXISTS profile_completed;
ALTER TABLE staff DROP COLUMN IF EXISTS profile_completion_date;

-- Remove other deductions column (moved to settlement rules)
ALTER TABLE staff DROP COLUMN IF EXISTS other_deductions;

-- Note: specialty column will remain in staff table as it's core employee information
