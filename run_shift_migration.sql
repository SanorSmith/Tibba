-- Step 1: Add Default Organization
INSERT INTO organizations (id, name, code, type, active)
SELECT 
  gen_random_uuid(),
  'Tibbna Hospital',
  'TBH',
  'hospital',
  true
WHERE NOT EXISTS (SELECT 1 FROM organizations);

-- Step 2: Create shifts table
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

-- Step 3: Create shift_schedules table
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

-- Step 4: Extend attendance_records
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

-- Step 5: Create hazard_departments table
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

-- Step 6: Insert default data
DO $$
DECLARE
  org_id UUID;
BEGIN
  SELECT id INTO org_id FROM organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    INSERT INTO shifts (organization_id, name, shift_type, start_time, end_time, differential_rate, description)
    VALUES
      (org_id, 'Day Shift', 'day', '08:00:00', '16:00:00', 0.00, 'Standard day shift - 8 hours'),
      (org_id, 'Evening Shift', 'evening', '16:00:00', '00:00:00', 0.15, 'Evening shift with 15% differential'),
      (org_id, 'Night Shift', 'night', '00:00:00', '08:00:00', 0.30, 'Night shift with 30% differential'),
      (org_id, '24-Hour Shift', 'split', '08:00:00', '08:00:00', 0.20, 'Full 24-hour shift')
    ON CONFLICT (organization_id, name) DO NOTHING;
    
    INSERT INTO hazard_departments (organization_id, department_id, hazard_type, hazard_rate)
    SELECT 
      org_id,
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
    ON CONFLICT (organization_id, department_id) DO NOTHING;
  END IF;
END $$;
