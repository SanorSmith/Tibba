-- Fix alert_rules table - Drop and recreate without organization_id

-- Drop existing table if it exists
DROP TABLE IF EXISTS alert_rules CASCADE;

-- Recreate alert_rules table without organization_id
CREATE TABLE alert_rules (
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

-- Create indexes
CREATE INDEX idx_alert_rules_active ON alert_rules(is_active);
CREATE INDEX idx_alert_rules_type ON alert_rules(alert_type);

-- Insert default alert rules
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
  );

-- Add comment
COMMENT ON TABLE alert_rules IS 'Configurable rules for automated alert generation';
