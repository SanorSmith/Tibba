-- =====================================================
-- STAFF ATTENDANCE SYSTEM MIGRATION
-- =====================================================
-- This migration ensures attendance tables work with the staff table
-- and adds necessary indexes for performance

-- Add indexes for staff table lookups
CREATE INDEX IF NOT EXISTS idx_attendance_transactions_staff_id 
ON attendance_transactions(employee_id);

CREATE INDEX IF NOT EXISTS idx_attendance_transactions_timestamp 
ON attendance_transactions(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_transactions_date 
ON attendance_transactions(DATE(timestamp));

CREATE INDEX IF NOT EXISTS idx_daily_attendance_staff_id 
ON daily_attendance(employee_id);

CREATE INDEX IF NOT EXISTS idx_daily_attendance_date 
ON daily_attendance(date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_attendance_staff_date 
ON daily_attendance(employee_id, date);

-- Create view for easy staff attendance lookup
CREATE OR REPLACE VIEW staff_attendance_today AS
SELECT 
  s.staffid as employee_id,
  s.firstname || ' ' || s.lastname as employee_name,
  s.custom_staff_id as employee_number,
  s.role,
  s.unit,
  da.date,
  da.first_in,
  da.last_out,
  da.total_hours,
  da.status,
  CASE 
    WHEN da.first_in IS NULL THEN 'NOT_CHECKED_IN'
    WHEN da.last_out IS NULL THEN 'CHECKED_IN'
    ELSE 'CHECKED_OUT'
  END as current_status
FROM staff s
LEFT JOIN daily_attendance da ON s.staffid = da.employee_id 
  AND da.date = CURRENT_DATE
WHERE s.role IS NOT NULL;

-- Create view for recent attendance transactions
CREATE OR REPLACE VIEW staff_attendance_transactions_recent AS
SELECT 
  at.id,
  at.employee_id,
  s.firstname || ' ' || s.lastname as employee_name,
  s.custom_staff_id as employee_number,
  s.role,
  s.unit,
  at.transaction_type,
  at.timestamp,
  at.device_type,
  at.location,
  at.is_valid,
  at.source
FROM attendance_transactions at
JOIN staff s ON at.employee_id = s.staffid
WHERE at.timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY at.timestamp DESC;

-- Function to process attendance transaction
CREATE OR REPLACE FUNCTION process_staff_attendance_transaction(
  p_employee_id UUID,
  p_transaction_type VARCHAR(10),
  p_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_device_type VARCHAR(50) DEFAULT 'MANUAL',
  p_source VARCHAR(20) DEFAULT 'API'
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  transaction_id UUID,
  daily_summary_id UUID
) AS $$
DECLARE
  v_transaction_id UUID;
  v_daily_summary_id UUID;
  v_employee_name VARCHAR(255);
  v_employee_number VARCHAR(50);
  v_date DATE;
  v_first_in TIMESTAMP WITH TIME ZONE;
  v_last_out TIMESTAMP WITH TIME ZONE;
  v_total_hours DECIMAL(5,2);
BEGIN
  -- Get employee details from staff table
  SELECT 
    firstname || ' ' || lastname,
    custom_staff_id
  INTO v_employee_name, v_employee_number
  FROM staff
  WHERE staffid = p_employee_id;
  
  IF v_employee_name IS NULL THEN
    RETURN QUERY SELECT false, 'Employee not found'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;
  
  v_date := DATE(p_timestamp);
  
  -- Insert transaction
  INSERT INTO attendance_transactions (
    employee_id,
    employee_name,
    employee_number,
    transaction_type,
    timestamp,
    device_type,
    source,
    is_valid,
    validation_status
  ) VALUES (
    p_employee_id,
    v_employee_name,
    v_employee_number,
    p_transaction_type,
    p_timestamp,
    p_device_type,
    p_source,
    true,
    'VALID'
  ) RETURNING id INTO v_transaction_id;
  
  -- Update or create daily summary
  IF p_transaction_type = 'IN' THEN
    -- Check if daily summary exists
    SELECT id, first_in INTO v_daily_summary_id, v_first_in
    FROM daily_attendance
    WHERE employee_id = p_employee_id AND date = v_date;
    
    IF v_daily_summary_id IS NULL THEN
      -- Create new daily summary
      INSERT INTO daily_attendance (
        employee_id,
        employee_name,
        employee_number,
        date,
        first_in,
        status
      ) VALUES (
        p_employee_id,
        v_employee_name,
        v_employee_number,
        v_date,
        p_timestamp,
        'PRESENT'
      ) RETURNING id INTO v_daily_summary_id;
    ELSIF v_first_in IS NULL THEN
      -- Update first_in if not set
      UPDATE daily_attendance
      SET first_in = p_timestamp,
          status = 'PRESENT'
      WHERE id = v_daily_summary_id;
    END IF;
  ELSIF p_transaction_type = 'OUT' THEN
    -- Update last_out and calculate hours
    UPDATE daily_attendance
    SET last_out = p_timestamp,
        total_hours = CASE 
          WHEN first_in IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (p_timestamp - first_in)) / 3600
          ELSE total_hours
        END
    WHERE employee_id = p_employee_id AND date = v_date
    RETURNING id INTO v_daily_summary_id;
    
    IF v_daily_summary_id IS NULL THEN
      -- Create summary with only check-out (unusual case)
      INSERT INTO daily_attendance (
        employee_id,
        employee_name,
        employee_number,
        date,
        last_out,
        status
      ) VALUES (
        p_employee_id,
        v_employee_name,
        v_employee_number,
        v_date,
        p_timestamp,
        'PRESENT'
      ) RETURNING id INTO v_daily_summary_id;
    END IF;
  END IF;
  
  -- Mark transaction as processed
  UPDATE attendance_transactions
  SET processed = true,
      processed_at = NOW(),
      daily_summary_id = v_daily_summary_id
  WHERE id = v_transaction_id;
  
  RETURN QUERY SELECT 
    true, 
    'Transaction processed successfully'::TEXT, 
    v_transaction_id, 
    v_daily_summary_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON staff_attendance_today TO PUBLIC;
GRANT SELECT ON staff_attendance_transactions_recent TO PUBLIC;
GRANT EXECUTE ON FUNCTION process_staff_attendance_transaction TO PUBLIC;

COMMENT ON VIEW staff_attendance_today IS 'Current day attendance status for all staff members';
COMMENT ON VIEW staff_attendance_transactions_recent IS 'Recent attendance transactions (last 7 days)';
COMMENT ON FUNCTION process_staff_attendance_transaction IS 'Process check-in/out transaction and update daily summary';
