-- Migration: Job Categories Table
-- Description: Create table for managing job categories/positions
-- Version: 1.0
-- Created: 2026-02-28

-- Create job_categories table
CREATE TABLE IF NOT EXISTS job_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  title VARCHAR(100) NOT NULL,
  title_ar VARCHAR(100),
  description TEXT,
  category VARCHAR(50) NOT NULL, -- MEDICAL_STAFF, NURSING, ADMINISTRATIVE, SUPPORT, TECHNICAL
  level INTEGER DEFAULT 1, -- 1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Manager
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  requirements JSONB, -- Job requirements, qualifications, etc.
  responsibilities JSONB, -- List of responsibilities
  salary_range JSONB, -- Min, max, average salary info
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_job_categories_code ON job_categories(code);
CREATE INDEX idx_job_categories_category ON job_categories(category);
CREATE INDEX idx_job_categories_department_id ON job_categories(department_id);
CREATE INDEX idx_job_categories_is_active ON job_categories(is_active);
CREATE INDEX idx_job_categories_level ON job_categories(level);

-- Add RLS (Row Level Security)
ALTER TABLE job_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read job categories
CREATE POLICY "Job categories are viewable by authenticated users" ON job_categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow HR managers to insert job categories
CREATE POLICY "HR managers can insert job categories" ON job_categories
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.raw_user_meta_data->>'role' IN ('admin', 'hr_manager')
    )
  );

-- Allow HR managers to update job categories
CREATE POLICY "HR managers can update job categories" ON job_categories
  FOR UPDATE USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.raw_user_meta_data->>'role' IN ('admin', 'hr_manager')
    )
  );

-- Allow HR managers to delete job categories
CREATE POLICY "HR managers can delete job categories" ON job_categories
  FOR DELETE USING (
    auth.role() = 'authenticated' 
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.raw_user_meta_data->>'role' IN ('admin', 'hr_manager')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_job_categories_updated_at 
  BEFORE UPDATE ON job_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default job categories
INSERT INTO job_categories (code, title, title_ar, category, level, description) VALUES
-- Medical Staff
('DOC001', 'General Physician', 'طبيب عام', 'MEDICAL_STAFF', 2, 'Provides general medical care and treatment'),
('DOC002', 'Senior Physician', 'طبيب أقدم', 'MEDICAL_STAFF', 3, 'Senior medical practitioner with extensive experience'),
('DOC003', 'Specialist Doctor', 'طبيب اختصاصي', 'MEDICAL_STAFF', 3, 'Medical specialist in specific field'),
('DOC004', 'Consultant Doctor', 'طبيب استشاري', 'MEDICAL_STAFF', 4, 'Senior consultant with specialized expertise'),
('DOC005', 'Head of Department', 'رئيس القسم', 'MEDICAL_STAFF', 5, 'Department head and medical director'),

-- Nursing
('NUR001', 'Staff Nurse', 'ممرضة', 'NURSING', 2, 'Provides nursing care and patient support'),
('NUR002', 'Senior Nurse', 'ممرضة أقدم', 'NURSING', 3, 'Experienced nurse with additional responsibilities'),
('NUR003', 'Head Nurse', 'رئيسة التمريض', 'NURSING', 4, 'Nursing supervisor and team leader'),
('NUR004', 'Nursing Manager', 'مدير التمريض', 'NURSING', 5, 'Manages nursing department and staff'),

-- Administrative
('ADM001', 'Receptionist', 'موظف استقبال', 'ADMINISTRATIVE', 1, 'Handles front desk and patient registration'),
('ADM002', 'Administrative Assistant', 'مساعد إداري', 'ADMINISTRATIVE', 2, 'Provides administrative support'),
('ADM003', 'Office Manager', 'مدير مكتب', 'ADMINISTRATIVE', 3, 'Manages office operations and staff'),
('ADM004', 'HR Officer', 'موظف موارد بشرية', 'ADMINISTRATIVE', 2, 'Handles HR operations and employee relations'),
('ADM005', 'HR Manager', 'مدير موارد بشرية', 'ADMINISTRATIVE', 4, 'Manages human resources department'),

-- Support Staff
('SUP001', 'Cleaner', 'عامل نظافة', 'SUPPORT', 1, 'Maintains cleanliness and hygiene'),
('SUP002', 'Security Guard', 'حارس أمن', 'SUPPORT', 2, 'Provides security and safety'),
('SUP003', 'Driver', 'سائق', 'SUPPORT', 2, 'Provides transportation services'),
('SUP004', 'Maintenance Technician', 'فني صيانة', 'SUPPORT', 2, 'Performs maintenance and repairs'),

-- Technical
('TEC001', 'Lab Technician', 'فني مختبر', 'TECHNICAL', 2, 'Performs laboratory tests and analysis'),
('TEC002', 'Radiology Technician', 'فني أشعة', 'TECHNICAL', 2, 'Operates radiology equipment'),
('TEC003', 'Pharmacy Technician', 'فني صيدلة', 'TECHNICAL', 2, 'Assists pharmacists and prepares medications'),
('TEC004', 'IT Support', 'دعم فني', 'TECHNICAL', 2, 'Provides IT technical support'),

-- Management
('MGT001', 'Hospital Director', 'مدير المستشفى', 'ADMINISTRATIVE', 5, 'Overall hospital management'),
('MGT002', 'Medical Director', 'المدير الطبي', 'MEDICAL_STAFF', 5, 'Medical department management'),
('MGT003', 'Operations Manager', 'مدير العمليات', 'ADMINISTRATIVE', 4, 'Manages hospital operations'),
('MGT004', 'Finance Manager', 'مدير مالي', 'ADMINISTRATIVE', 4, 'Manages financial operations');

-- Add comments
COMMENT ON TABLE job_categories IS 'Table for managing job categories and positions within the hospital';
COMMENT ON COLUMN job_categories.id IS 'Unique identifier for the job category';
COMMENT ON COLUMN job_categories.code IS 'Unique code for the job category (e.g., DOC001)';
COMMENT ON COLUMN job_categories.title IS 'Job title in English';
COMMENT ON COLUMN job_categories.title_ar IS 'Job title in Arabic';
COMMENT ON COLUMN job_categories.description IS 'Job description and responsibilities';
COMMENT ON COLUMN job_categories.category IS 'Employee category (MEDICAL_STAFF, NURSING, ADMINISTRATIVE, SUPPORT, TECHNICAL)';
COMMENT ON COLUMN job_categories.level IS 'Seniority level (1=Junior, 2=Mid, 3=Senior, 4=Lead, 5=Manager)';
COMMENT ON COLUMN job_categories.department_id IS 'Associated department (optional)';
COMMENT ON COLUMN job_categories.is_active IS 'Whether this job category is currently active';
COMMENT ON COLUMN job_categories.requirements IS 'Job requirements and qualifications (JSON)';
COMMENT ON COLUMN job_categories.responsibilities IS 'List of job responsibilities (JSON)';
COMMENT ON COLUMN job_categories.salary_range IS 'Salary range information (JSON)';
