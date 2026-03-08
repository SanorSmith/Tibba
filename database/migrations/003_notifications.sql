-- =====================================================
-- NOTIFICATION SYSTEM TABLES
-- Email, SMS, and In-App Notifications
-- =====================================================

-- =====================================================
-- NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  -- Primary Key
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id           UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Recipient
  recipient_id              UUID NOT NULL,
  recipient_name            VARCHAR(255),
  recipient_email           VARCHAR(255),
  recipient_phone           VARCHAR(50),
  
  -- Notification Details
  notification_type         VARCHAR(50) NOT NULL, -- LEAVE_SUBMITTED, LEAVE_APPROVED, LEAVE_REJECTED, etc.
  category                  VARCHAR(50) DEFAULT 'LEAVE', -- LEAVE, ATTENDANCE, PAYROLL, etc.
  priority                  VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
  
  -- Content
  title                     VARCHAR(255) NOT NULL,
  message                   TEXT NOT NULL,
  action_url                VARCHAR(500),
  action_label              VARCHAR(100),
  
  -- Related Entity
  related_entity_type       VARCHAR(50), -- LEAVE_REQUEST, APPROVAL, etc.
  related_entity_id         UUID,
  
  -- Delivery Channels
  send_email                BOOLEAN DEFAULT true,
  send_sms                  BOOLEAN DEFAULT false,
  send_in_app               BOOLEAN DEFAULT true,
  
  -- Email Status
  email_sent                BOOLEAN DEFAULT false,
  email_sent_at             TIMESTAMP WITH TIME ZONE,
  email_error               TEXT,
  
  -- SMS Status
  sms_sent                  BOOLEAN DEFAULT false,
  sms_sent_at               TIMESTAMP WITH TIME ZONE,
  sms_error                 TEXT,
  
  -- In-App Status
  is_read                   BOOLEAN DEFAULT false,
  read_at                   TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata                  JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at                TIMESTAMP WITH TIME ZONE
);

-- =====================================================
-- NOTIFICATION TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  -- Primary Key
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id           UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Template Details
  template_code             VARCHAR(100) NOT NULL UNIQUE,
  template_name             VARCHAR(255) NOT NULL,
  category                  VARCHAR(50) DEFAULT 'LEAVE',
  
  -- Content Templates
  email_subject             VARCHAR(255),
  email_body                TEXT,
  sms_body                  VARCHAR(500),
  in_app_title              VARCHAR(255),
  in_app_message            TEXT,
  
  -- Variables (JSON array of variable names)
  variables                 JSONB DEFAULT '[]'::jsonb,
  
  -- Default Settings
  default_send_email        BOOLEAN DEFAULT true,
  default_send_sms          BOOLEAN DEFAULT false,
  default_send_in_app       BOOLEAN DEFAULT true,
  default_priority          VARCHAR(20) DEFAULT 'NORMAL',
  
  -- Status
  is_active                 BOOLEAN DEFAULT true,
  
  -- Audit
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- NOTIFICATION PREFERENCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  -- Primary Key
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id           UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- User
  user_id                   UUID NOT NULL,
  
  -- Preferences by Category
  category                  VARCHAR(50) NOT NULL,
  notification_type         VARCHAR(50),
  
  -- Channel Preferences
  enable_email              BOOLEAN DEFAULT true,
  enable_sms                BOOLEAN DEFAULT false,
  enable_in_app             BOOLEAN DEFAULT true,
  
  -- Frequency
  digest_mode               BOOLEAN DEFAULT false, -- Send as daily digest
  digest_time               TIME DEFAULT '09:00:00',
  
  -- Timestamps
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(user_id, category, notification_type)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Notifications Indexes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_recipient') THEN
    CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_type') THEN
    CREATE INDEX idx_notifications_type ON notifications(notification_type);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_category') THEN
    CREATE INDEX idx_notifications_category ON notifications(category);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_created') THEN
    CREATE INDEX idx_notifications_created ON notifications(created_at);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_read') THEN
    CREATE INDEX idx_notifications_read ON notifications(is_read);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_entity') THEN
    CREATE INDEX idx_notifications_entity ON notifications(related_entity_type, related_entity_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_notifications_org') THEN
    CREATE INDEX idx_notifications_org ON notifications(organization_id);
  END IF;
END $$;

-- Notification Templates Indexes
CREATE INDEX IF NOT EXISTS idx_templates_code ON notification_templates(template_code);
CREATE INDEX IF NOT EXISTS idx_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_org ON notification_templates(organization_id);

-- Notification Preferences Indexes
CREATE INDEX IF NOT EXISTS idx_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_category ON notification_preferences(category);
CREATE INDEX IF NOT EXISTS idx_preferences_org ON notification_preferences(organization_id);

-- =====================================================
-- INSERT DEFAULT NOTIFICATION TEMPLATES
-- =====================================================

INSERT INTO notification_templates (template_code, template_name, category, email_subject, email_body, in_app_title, in_app_message, variables) VALUES
('LEAVE_SUBMITTED', 'Leave Request Submitted', 'LEAVE', 
 'Leave Request Submitted - {{employee_name}}',
 'Dear {{manager_name}},\n\n{{employee_name}} has submitted a leave request:\n\nLeave Type: {{leave_type}}\nDates: {{start_date}} to {{end_date}}\nDays: {{days_count}}\nReason: {{reason}}\n\nPlease review and approve/reject this request.\n\nView Request: {{action_url}}',
 'New Leave Request',
 '{{employee_name}} submitted a leave request for {{days_count}} days',
 '["employee_name", "manager_name", "leave_type", "start_date", "end_date", "days_count", "reason", "action_url"]'::jsonb
),
('LEAVE_APPROVED', 'Leave Request Approved', 'LEAVE',
 'Leave Request Approved',
 'Dear {{employee_name}},\n\nYour leave request has been approved:\n\nLeave Type: {{leave_type}}\nDates: {{start_date}} to {{end_date}}\nDays: {{days_count}}\nApproved By: {{approved_by}}\n\nEnjoy your time off!',
 'Leave Request Approved',
 'Your {{leave_type}} request for {{days_count}} days has been approved',
 '["employee_name", "leave_type", "start_date", "end_date", "days_count", "approved_by"]'::jsonb
),
('LEAVE_REJECTED', 'Leave Request Rejected', 'LEAVE',
 'Leave Request Rejected',
 'Dear {{employee_name}},\n\nYour leave request has been rejected:\n\nLeave Type: {{leave_type}}\nDates: {{start_date}} to {{end_date}}\nRejected By: {{rejected_by}}\nReason: {{rejection_reason}}\n\nPlease contact HR if you have questions.',
 'Leave Request Rejected',
 'Your {{leave_type}} request has been rejected: {{rejection_reason}}',
 '["employee_name", "leave_type", "start_date", "end_date", "rejected_by", "rejection_reason"]'::jsonb
),
('LEAVE_PENDING_APPROVAL', 'Leave Pending Your Approval', 'LEAVE',
 'Leave Request Pending Your Approval',
 'Dear {{approver_name}},\n\nA leave request is pending your approval:\n\nEmployee: {{employee_name}}\nLeave Type: {{leave_type}}\nDates: {{start_date}} to {{end_date}}\nDays: {{days_count}}\n\nPlease review: {{action_url}}',
 'Leave Approval Required',
 '{{employee_name}} - {{leave_type}} for {{days_count}} days',
 '["approver_name", "employee_name", "leave_type", "start_date", "end_date", "days_count", "action_url"]'::jsonb
),
('LEAVE_CANCELLED', 'Leave Request Cancelled', 'LEAVE',
 'Leave Request Cancelled',
 'Dear {{manager_name}},\n\n{{employee_name}} has cancelled their leave request:\n\nLeave Type: {{leave_type}}\nDates: {{start_date}} to {{end_date}}\nCancellation Reason: {{cancellation_reason}}',
 'Leave Request Cancelled',
 '{{employee_name}} cancelled their {{leave_type}} request',
 '["manager_name", "employee_name", "leave_type", "start_date", "end_date", "cancellation_reason"]'::jsonb
),
('LEAVE_REMINDER', 'Upcoming Leave Reminder', 'LEAVE',
 'Reminder: Leave Starting Soon',
 'Dear {{employee_name}},\n\nThis is a reminder that your leave starts in {{days_until}} day(s):\n\nLeave Type: {{leave_type}}\nStart Date: {{start_date}}\nEnd Date: {{end_date}}\nReturn Date: {{return_date}}',
 'Leave Starting Soon',
 'Your {{leave_type}} starts in {{days_until}} day(s)',
 '["employee_name", "leave_type", "start_date", "end_date", "return_date", "days_until"]'::jsonb
),
('APPROVAL_ESCALATED', 'Leave Approval Escalated', 'LEAVE',
 'Leave Approval Escalated - Action Required',
 'Dear {{escalated_to_name}},\n\nA leave approval has been escalated to you:\n\nEmployee: {{employee_name}}\nLeave Type: {{leave_type}}\nDates: {{start_date}} to {{end_date}}\nOriginal Approver: {{original_approver}}\nReason: Approval deadline exceeded\n\nPlease review urgently: {{action_url}}',
 'Leave Approval Escalated',
 'Escalated: {{employee_name}} - {{leave_type}}',
 '["escalated_to_name", "employee_name", "leave_type", "start_date", "end_date", "original_approver", "action_url"]'::jsonb
);

-- =====================================================
-- FUNCTION: Send Notification
-- =====================================================
CREATE OR REPLACE FUNCTION send_notification(
  p_recipient_id UUID,
  p_template_code VARCHAR(100),
  p_variables JSONB,
  p_related_entity_type VARCHAR(50) DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_template RECORD;
  v_title TEXT;
  v_message TEXT;
  v_email_subject TEXT;
  v_email_body TEXT;
  v_recipient RECORD;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM notification_templates
  WHERE template_code = p_template_code
  AND is_active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_code;
  END IF;
  
  -- Get recipient details
  SELECT 
    staffid,
    CONCAT(firstname, ' ', lastname) as name,
    email,
    phone
  INTO v_recipient
  FROM staff
  WHERE staffid = p_recipient_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient not found: %', p_recipient_id;
  END IF;
  
  -- Replace variables in templates (simple replacement)
  v_title := v_template.in_app_title;
  v_message := v_template.in_app_message;
  v_email_subject := v_template.email_subject;
  v_email_body := v_template.email_body;
  
  -- Create notification
  INSERT INTO notifications (
    recipient_id,
    recipient_name,
    recipient_email,
    recipient_phone,
    notification_type,
    category,
    priority,
    title,
    message,
    related_entity_type,
    related_entity_id,
    send_email,
    send_sms,
    send_in_app,
    metadata
  ) VALUES (
    p_recipient_id,
    v_recipient.name,
    v_recipient.email,
    v_recipient.phone,
    p_template_code,
    v_template.category,
    v_template.default_priority,
    v_title,
    v_message,
    p_related_entity_type,
    p_related_entity_id,
    v_template.default_send_email,
    v_template.default_send_sms,
    v_template.default_send_in_app,
    p_variables
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Send notification on leave status change
-- =====================================================
CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_variables JSONB;
BEGIN
  -- Leave approved
  IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
    v_variables := jsonb_build_object(
      'employee_name', NEW.employee_name,
      'leave_type', NEW.leave_type_code,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'days_count', NEW.working_days_count,
      'approved_by', NEW.approved_by_name
    );
    
    PERFORM send_notification(
      NEW.employee_id::UUID,
      'LEAVE_APPROVED',
      v_variables,
      'LEAVE_REQUEST',
      NEW.id
    );
  END IF;
  
  -- Leave rejected
  IF NEW.status = 'REJECTED' AND (OLD.status IS NULL OR OLD.status != 'REJECTED') THEN
    v_variables := jsonb_build_object(
      'employee_name', NEW.employee_name,
      'leave_type', NEW.leave_type_code,
      'start_date', NEW.start_date,
      'end_date', NEW.end_date,
      'rejected_by', NEW.approved_by_name,
      'rejection_reason', NEW.rejection_reason
    );
    
    PERFORM send_notification(
      NEW.employee_id::UUID,
      'LEAVE_REJECTED',
      v_variables,
      'LEAVE_REQUEST',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_leave_status ON leave_requests;

CREATE TRIGGER trg_notify_leave_status
  AFTER UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_leave_status_change();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notifications IS 'All notifications sent to users via email, SMS, or in-app';
COMMENT ON TABLE notification_templates IS 'Templates for different notification types';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery';
COMMENT ON FUNCTION send_notification(UUID, VARCHAR, JSONB, VARCHAR, UUID) IS 'Create and queue a notification for delivery';
