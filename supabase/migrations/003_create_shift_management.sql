-- Migration: Create Shift Management System
-- Description: Add shifts, shift_schedules tables and extend attendance_records

-- ============================================================================
-- 1. CREATE SHIFTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('day', 'night', 'evening', 'split')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  differential_rate DECIMAL(5,2) DEFAULT 0.00,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_shift_name_per_org UNIQUE (organization_id, name)
);

-- Index for faster queries
CREATE INDEX idx_shifts_organization ON shifts(organization_id);
CREATE INDEX idx_shifts_type ON shifts(shift_type);
CREATE INDEX idx_shifts_active ON shifts(is_active);

-- ============================================================================
-- 2. CREATE SHIFT SCHEDULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  schedule_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  CONSTRAINT unique_employee_date UNIQUE (employee_id, schedule_date)
);

-- Indexes for faster queries
CREATE INDEX idx_shift_schedules_employee ON shift_schedules(employee_id);
CREATE INDEX idx_shift_schedules_shift ON shift_schedules(shift_id);
CREATE INDEX idx_shift_schedules_date ON shift_schedules(schedule_date);
CREATE INDEX idx_shift_schedules_status ON shift_schedules(status);

-- ============================================================================
-- 3. EXTEND ATTENDANCE_RECORDS TABLE
-- ============================================================================

-- Add shift_type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_records' AND column_name = 'shift_type'
  ) THEN
    ALTER TABLE attendance_records 
    ADD COLUMN shift_type VARCHAR(20) CHECK (shift_type IN ('day', 'night', 'evening', 'split'));
  END IF;
END $$;

-- Add is_hazard_shift column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_records' AND column_name = 'is_hazard_shift'
  ) THEN
    ALTER TABLE attendance_records 
    ADD COLUMN is_hazard_shift BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add shift_schedule_id column for linking
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendance_records' AND column_name = 'shift_schedule_id'
  ) THEN
    ALTER TABLE attendance_records 
    ADD COLUMN shift_schedule_id UUID REFERENCES shift_schedules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for shift_type
CREATE INDEX IF NOT EXISTS idx_attendance_shift_type ON attendance_records(shift_type);
CREATE INDEX IF NOT EXISTS idx_attendance_hazard_shift ON attendance_records(is_hazard_shift);

-- ============================================================================
-- 4. CREATE HAZARD DEPARTMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS hazard_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  hazard_type VARCHAR(50) NOT NULL,
  hazard_rate DECIMAL(5,2) DEFAULT 50.00,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_hazard_dept UNIQUE (organization_id, department_id)
);

CREATE INDEX idx_hazard_departments_dept ON hazard_departments(department_id);
CREATE INDEX idx_hazard_departments_active ON hazard_departments(is_active);

-- ============================================================================
-- 5. INSERT DEFAULT SHIFTS
-- ============================================================================

-- Get the first organization ID
DO $$
DECLARE
  org_id UUID;
BEGIN
  SELECT id INTO org_id FROM organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    -- Insert default shifts
    INSERT INTO shifts (organization_id, name, shift_type, start_time, end_time, differential_rate, description)
    VALUES
      (org_id, 'Day Shift', 'day', '08:00:00', '16:00:00', 0.00, 'Standard day shift - 8 hours'),
      (org_id, 'Evening Shift', 'evening', '16:00:00', '00:00:00', 0.15, 'Evening shift with 15% differential'),
      (org_id, 'Night Shift', 'night', '00:00:00', '08:00:00', 0.30, 'Night shift with 30% differential'),
      (org_id, '24-Hour Shift', 'split', '08:00:00', '08:00:00', 0.20, 'Full 24-hour shift')
    ON CONFLICT (organization_id, name) DO NOTHING;
    
    -- Mark hazard departments (ICU, ER, COVID)
    INSERT INTO hazard_departments (organization_id, department_id, hazard_type, hazard_rate)
    SELECT 
      org_id,
      d.id,
      'high_risk',
      50.00
    FROM departments d
    WHERE d.organization_id = org_id
      AND (
        LOWER(d.name) LIKE '%icu%' 
        OR LOWER(d.name) LIKE '%intensive%'
        OR LOWER(d.name) LIKE '%emergency%'
        OR LOWER(d.name) LIKE '%er%'
        OR LOWER(d.name) LIKE '%covid%'
        OR LOWER(d.code) IN ('ICU', 'ER', 'COVID', 'CCU')
      )
    ON CONFLICT (organization_id, department_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to detect shift type based on time
CREATE OR REPLACE FUNCTION detect_shift_type(check_in_time TIME)
RETURNS VARCHAR(20) AS $$
BEGIN
  -- Night shift: 00:00 - 08:00
  IF check_in_time >= '00:00:00' AND check_in_time < '08:00:00' THEN
    RETURN 'night';
  -- Day shift: 08:00 - 16:00
  ELSIF check_in_time >= '08:00:00' AND check_in_time < '16:00:00' THEN
    RETURN 'day';
  -- Evening shift: 16:00 - 00:00
  ELSIF check_in_time >= '16:00:00' AND check_in_time <= '23:59:59' THEN
    RETURN 'evening';
  ELSE
    RETURN 'day';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if department is hazardous
CREATE OR REPLACE FUNCTION is_hazard_department(dept_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_hazard BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM hazard_departments 
    WHERE department_id = dept_id 
      AND is_active = true
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
  ) INTO is_hazard;
  
  RETURN COALESCE(is_hazard, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 7. CREATE TRIGGERS FOR AUTO-UPDATING
-- ============================================================================

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shift_schedules_updated_at
  BEFORE UPDATE ON shift_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hazard_departments_updated_at
  BEFORE UPDATE ON hazard_departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. GRANT PERMISSIONS (if using RLS)
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_departments ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth setup)
CREATE POLICY "Allow authenticated users to read shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow HR managers to manage shifts"
  ON shifts FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read shift schedules"
  ON shift_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow HR managers to manage shift schedules"
  ON shift_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add comment to track migration
COMMENT ON TABLE shifts IS 'Shift definitions with types and differential rates';
COMMENT ON TABLE shift_schedules IS 'Employee shift assignments and schedules';
COMMENT ON TABLE hazard_departments IS 'Departments designated as hazardous for pay differential';
COMMENT ON COLUMN attendance_records.shift_type IS 'Type of shift worked (day/night/evening/split)';
COMMENT ON COLUMN attendance_records.is_hazard_shift IS 'Whether this shift qualifies for hazard pay';
