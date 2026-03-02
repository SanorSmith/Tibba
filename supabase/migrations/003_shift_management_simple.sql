-- Migration: Create Shift Management System (Simplified for current DB structure)
-- Description: Add shifts and extend attendance_records

-- ============================================================================
-- 1. CREATE SHIFTS TABLE (without organization_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  shift_type VARCHAR(20) NOT NULL CHECK (shift_type IN ('day', 'night', 'evening', 'split')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  differential_rate DECIMAL(5,2) DEFAULT 0.00,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shifts_type ON shifts(shift_type);
CREATE INDEX IF NOT EXISTS idx_shifts_active ON shifts(is_active);

-- ============================================================================
-- 2. CREATE SHIFT SCHEDULES TABLE (without organization_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS shift_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shift_schedules_employee ON shift_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_shift ON shift_schedules(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_date ON shift_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_shift_schedules_status ON shift_schedules(status);

-- ============================================================================
-- 3. EXTEND ATTENDANCE_RECORDS TABLE
-- ============================================================================

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_attendance_shift_type ON attendance_records(shift_type);
CREATE INDEX IF NOT EXISTS idx_attendance_hazard_shift ON attendance_records(is_hazard_shift);

-- ============================================================================
-- 4. CREATE HAZARD DEPARTMENTS TABLE (without organization_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hazard_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE UNIQUE,
  hazard_type VARCHAR(50) NOT NULL,
  hazard_rate DECIMAL(5,2) DEFAULT 50.00,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_to DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hazard_departments_dept ON hazard_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_hazard_departments_active ON hazard_departments(is_active);

-- ============================================================================
-- 5. INSERT DEFAULT SHIFTS
-- ============================================================================

INSERT INTO shifts (name, shift_type, start_time, end_time, differential_rate, description)
VALUES
  ('Day Shift', 'day', '08:00:00', '16:00:00', 0.00, 'Standard day shift - 8 hours'),
  ('Evening Shift', 'evening', '16:00:00', '00:00:00', 0.15, 'Evening shift with 15% differential'),
  ('Night Shift', 'night', '00:00:00', '08:00:00', 0.30, 'Night shift with 30% differential'),
  ('24-Hour Shift', 'split', '08:00:00', '08:00:00', 0.20, 'Full 24-hour shift')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. MARK HAZARD DEPARTMENTS
-- ============================================================================

INSERT INTO hazard_departments (department_id, hazard_type, hazard_rate)
SELECT 
  d.id,
  'high_risk',
  50.00
FROM departments d
WHERE d.type = 'department'
  AND (
    LOWER(d.name) LIKE '%icu%' 
    OR LOWER(d.name) LIKE '%intensive%'
    OR LOWER(d.name) LIKE '%emergency%'
    OR LOWER(d.name) LIKE '%er%'
    OR LOWER(d.name) LIKE '%covid%'
    OR LOWER(d.code) IN ('ICU', 'ER', 'COVID', 'CCU')
  )
ON CONFLICT (department_id) DO NOTHING;

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION detect_shift_type(check_in_time TIME)
RETURNS VARCHAR(20) AS $$
BEGIN
  IF check_in_time >= '00:00:00' AND check_in_time < '08:00:00' THEN
    RETURN 'night';
  ELSIF check_in_time >= '08:00:00' AND check_in_time < '16:00:00' THEN
    RETURN 'day';
  ELSIF check_in_time >= '16:00:00' AND check_in_time <= '23:59:59' THEN
    RETURN 'evening';
  ELSE
    RETURN 'day';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE shifts IS 'Shift definitions with types and differential rates';
COMMENT ON TABLE shift_schedules IS 'Employee shift assignments and schedules';
COMMENT ON TABLE hazard_departments IS 'Departments designated as hazardous for pay differential';
