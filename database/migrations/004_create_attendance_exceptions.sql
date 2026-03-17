-- =====================================================
-- ATTENDANCE EXCEPTIONS TABLE MIGRATION
-- =====================================================
-- This migration creates the attendance_exceptions table
-- to track attendance violations and exceptions
-- Integrates with existing attendance and leave systems

-- Create attendance_exceptions table
CREATE TABLE IF NOT EXISTS attendance_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  employee_id UUID NOT NULL,
  employee_name VARCHAR(255),
  employee_number VARCHAR(50),
  department VARCHAR(100),
  exception_date DATE NOT NULL,
  exception_type VARCHAR(30) NOT NULL,
  -- Exception types: LATE_ARRIVAL, EARLY_DEPARTURE, MISSING_CHECKOUT, 
  -- UNAUTHORIZED_ABSENCE, ABNORMAL_HOURS
  
  details TEXT,
  severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
  -- Severity: LOW, MEDIUM, HIGH
  
  minutes_late INTEGER,
  minutes_early INTEGER,
  scheduled_start TIME,
  scheduled_end TIME,
  actual_start TIME,
  actual_end TIME,
  
  review_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- Status: PENDING, JUSTIFIED, WARNING_ISSUED, DISMISSED
  
  justification TEXT,
  justified_by UUID,
  justified_by_name VARCHAR(255),
  justified_at TIMESTAMP WITH TIME ZONE,
  
  warning_issued BOOLEAN DEFAULT FALSE,
  warning_issued_by UUID,
  warning_issued_by_name VARCHAR(255),
  warning_issued_at TIMESTAMP WITH TIME ZONE,
  warning_details TEXT,
  
  dismissed_by UUID,
  dismissed_by_name VARCHAR(255),
  dismissed_at TIMESTAMP WITH TIME ZONE,
  dismissal_reason TEXT,
  
  -- Link to related records
  daily_attendance_id UUID,
  leave_request_id UUID,
  schedule_exception_id UUID,
  
  -- Metadata
  auto_detected BOOLEAN DEFAULT TRUE,
  detection_rules JSONB,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID,
  
  -- Foreign key constraints
  CONSTRAINT attendance_exceptions_employee_fkey 
    FOREIGN KEY (employee_id) REFERENCES staff(staffid) ON DELETE CASCADE,
  
  CONSTRAINT attendance_exceptions_daily_attendance_fkey 
    FOREIGN KEY (daily_attendance_id) REFERENCES daily_attendance(id) ON DELETE SET NULL,
    
  CONSTRAINT attendance_exceptions_leave_request_fkey 
    FOREIGN KEY (leave_request_id) REFERENCES leave_requests(id) ON DELETE SET NULL,
    
  CONSTRAINT attendance_exceptions_schedule_exception_fkey 
    FOREIGN KEY (schedule_exception_id) REFERENCES schedule_exceptions(id) ON DELETE SET NULL,
  
  -- Check constraints
  CONSTRAINT valid_exception_type CHECK (
    exception_type IN ('LATE_ARRIVAL', 'EARLY_DEPARTURE', 'MISSING_CHECKOUT', 
                       'UNAUTHORIZED_ABSENCE', 'ABNORMAL_HOURS')
  ),
  
  CONSTRAINT valid_severity CHECK (
    severity IN ('LOW', 'MEDIUM', 'HIGH')
  ),
  
  CONSTRAINT valid_review_status CHECK (
    review_status IN ('PENDING', 'JUSTIFIED', 'WARNING_ISSUED', 'DISMISSED')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_employee_id 
  ON attendance_exceptions(employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_date 
  ON attendance_exceptions(exception_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_status 
  ON attendance_exceptions(review_status);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_severity 
  ON attendance_exceptions(severity);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_type 
  ON attendance_exceptions(exception_type);

CREATE INDEX IF NOT EXISTS idx_attendance_exceptions_employee_date 
  ON attendance_exceptions(employee_id, exception_date);

-- Create view for easy exception lookup with employee details
CREATE OR REPLACE VIEW attendance_exceptions_detailed AS
SELECT 
  ae.*,
  s.firstname || ' ' || s.lastname as full_employee_name,
  s.custom_staff_id as staff_number,
  s.unit as department_name,
  s.role as employee_role,
  da.first_in,
  da.last_out,
  da.total_hours,
  da.status as attendance_status,
  lr.status as leave_status,
  lr.leave_type_code,
  se.exception_type as schedule_exception_type,
  se.status as schedule_exception_status
FROM attendance_exceptions ae
LEFT JOIN staff s ON ae.employee_id = s.staffid
LEFT JOIN daily_attendance da ON ae.daily_attendance_id = da.id
LEFT JOIN leave_requests lr ON ae.leave_request_id = lr.id
LEFT JOIN schedule_exceptions se ON ae.schedule_exception_id = se.id;

-- Function to auto-detect exceptions from daily attendance
CREATE OR REPLACE FUNCTION detect_attendance_exceptions(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  exceptions_detected INTEGER,
  exceptions_created INTEGER
) AS $$
DECLARE
  v_exceptions_detected INTEGER := 0;
  v_exceptions_created INTEGER := 0;
  v_work_start TIME := '08:30:00';
  v_work_end TIME := '16:30:00';
  v_late_threshold INTEGER := 15; -- minutes
BEGIN
  -- Detect late arrivals
  INSERT INTO attendance_exceptions (
    employee_id,
    employee_name,
    employee_number,
    department,
    exception_date,
    exception_type,
    details,
    severity,
    minutes_late,
    scheduled_start,
    actual_start,
    daily_attendance_id,
    auto_detected,
    detection_rules
  )
  SELECT 
    da.employee_id,
    da.employee_name,
    da.employee_number,
    s.unit,
    da.date,
    'LATE_ARRIVAL',
    'Arrived ' || da.late_arrival_minutes || ' minutes late',
    CASE 
      WHEN da.late_arrival_minutes >= 60 THEN 'HIGH'
      WHEN da.late_arrival_minutes >= 30 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    da.late_arrival_minutes,
    v_work_start,
    da.first_in::TIME,
    da.id,
    TRUE,
    jsonb_build_object(
      'threshold_minutes', v_late_threshold,
      'work_start', v_work_start
    )
  FROM daily_attendance da
  JOIN staff s ON da.employee_id = s.staffid
  WHERE da.date = p_date
    AND da.late_arrival_minutes >= v_late_threshold
    AND NOT EXISTS (
      SELECT 1 FROM attendance_exceptions ae
      WHERE ae.employee_id = da.employee_id
        AND ae.exception_date = da.date
        AND ae.exception_type = 'LATE_ARRIVAL'
    );
  
  GET DIAGNOSTICS v_exceptions_created = ROW_COUNT;
  v_exceptions_detected := v_exceptions_detected + v_exceptions_created;
  
  -- Detect early departures
  INSERT INTO attendance_exceptions (
    employee_id,
    employee_name,
    employee_number,
    department,
    exception_date,
    exception_type,
    details,
    severity,
    minutes_early,
    scheduled_end,
    actual_end,
    daily_attendance_id,
    auto_detected,
    detection_rules
  )
  SELECT 
    da.employee_id,
    da.employee_name,
    da.employee_number,
    s.unit,
    da.date,
    'EARLY_DEPARTURE',
    'Left ' || da.early_departure_min || ' minutes early',
    CASE 
      WHEN da.early_departure_min >= 60 THEN 'HIGH'
      WHEN da.early_departure_min >= 30 THEN 'MEDIUM'
      ELSE 'LOW'
    END,
    da.early_departure_min,
    v_work_end,
    da.last_out::TIME,
    da.id,
    TRUE,
    jsonb_build_object(
      'threshold_minutes', v_late_threshold,
      'work_end', v_work_end
    )
  FROM daily_attendance da
  JOIN staff s ON da.employee_id = s.staffid
  WHERE da.date = p_date
    AND da.early_departure_min >= v_late_threshold
    AND NOT EXISTS (
      SELECT 1 FROM attendance_exceptions ae
      WHERE ae.employee_id = da.employee_id
        AND ae.exception_date = da.date
        AND ae.exception_type = 'EARLY_DEPARTURE'
    );
  
  GET DIAGNOSTICS v_exceptions_created = ROW_COUNT;
  v_exceptions_detected := v_exceptions_detected + v_exceptions_created;
  
  -- Detect missing checkouts (previous day only)
  IF p_date < CURRENT_DATE THEN
    INSERT INTO attendance_exceptions (
      employee_id,
      employee_name,
      employee_number,
      department,
      exception_date,
      exception_type,
      details,
      severity,
      daily_attendance_id,
      auto_detected
    )
    SELECT 
      da.employee_id,
      da.employee_name,
      da.employee_number,
      s.unit,
      da.date,
      'MISSING_CHECKOUT',
      'No checkout record found',
      'MEDIUM',
      da.id,
      TRUE
    FROM daily_attendance da
    JOIN staff s ON da.employee_id = s.staffid
    WHERE da.date = p_date
      AND da.first_in IS NOT NULL
      AND da.last_out IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM attendance_exceptions ae
        WHERE ae.employee_id = da.employee_id
          AND ae.exception_date = da.date
          AND ae.exception_type = 'MISSING_CHECKOUT'
      );
    
    GET DIAGNOSTICS v_exceptions_created = ROW_COUNT;
    v_exceptions_detected := v_exceptions_detected + v_exceptions_created;
  END IF;
  
  RETURN QUERY SELECT v_exceptions_detected, v_exceptions_detected;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_exceptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_exceptions_updated_at
  BEFORE UPDATE ON attendance_exceptions
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_exceptions_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON attendance_exceptions TO hr_staff;
-- GRANT SELECT ON attendance_exceptions_detailed TO hr_staff;

COMMENT ON TABLE attendance_exceptions IS 'Tracks attendance violations and exceptions for HR review';
COMMENT ON COLUMN attendance_exceptions.exception_type IS 'Type of exception: LATE_ARRIVAL, EARLY_DEPARTURE, MISSING_CHECKOUT, UNAUTHORIZED_ABSENCE, ABNORMAL_HOURS';
COMMENT ON COLUMN attendance_exceptions.severity IS 'Severity level: LOW, MEDIUM, HIGH';
COMMENT ON COLUMN attendance_exceptions.review_status IS 'Review status: PENDING, JUSTIFIED, WARNING_ISSUED, DISMISSED';
COMMENT ON FUNCTION detect_attendance_exceptions IS 'Auto-detects attendance exceptions from daily attendance records';
