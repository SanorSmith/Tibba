-- Migration: Create Alerts and Workflow System (Simplified for current DB structure)
-- Description: Add alerts, approval_workflows, and approval_steps tables

-- ============================================================================
-- 1. CREATE ALERTS TABLE (without organization_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'license_expiry',
    'attendance_anomaly',
    'leave_balance',
    'late_arrival',
    'missing_checkout',
    'high_overtime',
    'consecutive_absence',
    'system'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'urgent')),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_required BOOLEAN DEFAULT false,
  action_url VARCHAR(500),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_alerts_employee ON alerts(employee_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);

-- ============================================================================
-- 2. CREATE APPROVAL WORKFLOWS TABLE (without organization_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN (
    'leave_request',
    'overtime_request',
    'expense_claim',
    'loan_request',
    'advance_request'
  )),
  entity_id UUID NOT NULL,
  current_level INTEGER DEFAULT 1,
  total_levels INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'in_progress',
    'approved',
    'rejected',
    'cancelled'
  )),
  submitted_by UUID NOT NULL REFERENCES employees(id),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT unique_entity_workflow UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_workflows_entity ON approval_workflows(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON approval_workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_submitted_by ON approval_workflows(submitted_by);

-- ============================================================================
-- 3. CREATE APPROVAL STEPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
  level INTEGER NOT NULL,
  approver_id UUID NOT NULL REFERENCES employees(id),
  approver_role VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'rejected',
    'skipped'
  )),
  action_date TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_workflow_level UNIQUE (workflow_id, level)
);

CREATE INDEX IF NOT EXISTS idx_approval_steps_workflow ON approval_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver ON approval_steps(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_status ON approval_steps(status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_level ON approval_steps(level);

-- ============================================================================
-- 4. CREATE NOTIFICATION QUEUE TABLE (without organization_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
    'email',
    'sms',
    'in_app',
    'push'
  )),
  recipient_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  subject VARCHAR(500),
  body TEXT NOT NULL,
  template_name VARCHAR(100),
  template_data JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending',
    'sent',
    'failed',
    'cancelled'
  )),
  priority INTEGER DEFAULT 5,
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notification_queue(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notification_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notification_queue(priority DESC);

-- ============================================================================
-- 5. CREATE ALERT RULES TABLE (without organization_id)
-- ============================================================================

CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name VARCHAR(100) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB NOT NULL,
  thresholds JSONB DEFAULT '{}',
  notification_channels JSONB DEFAULT '["in_app"]',
  recipients JSONB DEFAULT '[]',
  schedule_cron VARCHAR(100),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_alert_rules_type ON alert_rules(alert_type);

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_approvals(emp_id UUID)
RETURNS TABLE (
  workflow_id UUID,
  entity_type VARCHAR,
  entity_id UUID,
  level INTEGER,
  submitted_by UUID,
  submitted_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.entity_type,
    w.entity_id,
    s.level,
    w.submitted_by,
    w.submitted_at
  FROM approval_workflows w
  JOIN approval_steps s ON w.id = s.workflow_id
  WHERE s.approver_id = emp_id
    AND s.status = 'pending'
    AND w.status IN ('pending', 'in_progress')
  ORDER BY w.submitted_at ASC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION create_alert(
  p_alert_type VARCHAR,
  p_severity VARCHAR,
  p_employee_id UUID,
  p_title VARCHAR,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO alerts (
    alert_type,
    severity,
    employee_id,
    title,
    message,
    data
  ) VALUES (
    p_alert_type,
    p_severity,
    p_employee_id,
    p_title,
    p_message,
    p_data
  ) RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION queue_notification(
  p_notification_type VARCHAR,
  p_recipient_id UUID,
  p_subject VARCHAR,
  p_body TEXT,
  p_template_name VARCHAR DEFAULT NULL,
  p_template_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_recipient_email VARCHAR;
BEGIN
  SELECT email INTO v_recipient_email
  FROM employees
  WHERE id = p_recipient_id;
  
  INSERT INTO notification_queue (
    notification_type,
    recipient_id,
    recipient_email,
    subject,
    body,
    template_name,
    template_data
  ) VALUES (
    p_notification_type,
    p_recipient_id,
    v_recipient_email,
    p_subject,
    p_body,
    p_template_name,
    p_template_data
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. INSERT DEFAULT ALERT RULES
-- ============================================================================

INSERT INTO alert_rules (
  rule_name,
  alert_type,
  is_active,
  conditions,
  thresholds,
  notification_channels,
  schedule_cron
) VALUES
  (
    'License Expiry Check',
    'license_expiry',
    true,
    '{"check_field": "expiry_date", "check_type": "days_until"}',
    '{"warning": 90, "critical": 30, "urgent": 7}',
    '["email", "in_app"]',
    '0 6 * * *'
  ),
  (
    'Late Arrival Pattern Detection',
    'late_arrival',
    true,
    '{"check_period": "week", "check_field": "status", "check_value": "LATE"}',
    '{"warning": 3, "critical": 5}',
    '["email", "in_app"]',
    '0 10 * * 1'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE alerts IS 'System alerts and notifications for employees';
COMMENT ON TABLE approval_workflows IS 'Multi-level approval workflows for various entities';
COMMENT ON TABLE approval_steps IS 'Individual approval steps within workflows';
COMMENT ON TABLE notification_queue IS 'Queue for email, SMS, and push notifications';
COMMENT ON TABLE alert_rules IS 'Configurable rules for automated alert generation';
