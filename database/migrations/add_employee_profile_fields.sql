-- Add employee profile management fields to staff table
-- This supports CV, education, work history, and file attachments

ALTER TABLE staff ADD COLUMN IF NOT EXISTS cv_summary TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS cv_file_url VARCHAR(500);
ALTER TABLE staff ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS work_history JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT false;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS profile_completion_date TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN staff.cv_summary IS 'Brief professional summary or objective';
COMMENT ON COLUMN staff.cv_file_url IS 'URL to uploaded CV/resume file';
COMMENT ON COLUMN staff.education IS 'Array of education records: [{degree, institution, field, start_date, end_date, gpa}]';
COMMENT ON COLUMN staff.work_history IS 'Array of work experience: [{company, position, start_date, end_date, responsibilities, reason_for_leaving}]';
COMMENT ON COLUMN staff.certifications IS 'Array of certifications: [{name, issuer, issue_date, expiry_date, credential_id, file_url}]';
COMMENT ON COLUMN staff.languages IS 'Array of languages: [{language, proficiency, can_read, can_write, can_speak}]';
COMMENT ON COLUMN staff.skills IS 'Array of skills: [{skill, level, years_experience}]';
COMMENT ON COLUMN staff.attachments IS 'Array of file attachments: [{name, type, url, upload_date, size}]';
COMMENT ON COLUMN staff.profile_completed IS 'Whether employee has completed their profile';
COMMENT ON COLUMN staff.profile_completion_date IS 'Date when profile was marked as complete';
