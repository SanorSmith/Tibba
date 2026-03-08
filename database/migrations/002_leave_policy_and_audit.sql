-- =====================================================
-- LEAVE POLICY RULES AND AUDIT TABLES
-- Business Rules and Audit Trail
-- =====================================================

-- =====================================================
-- LEAVE POLICY RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_policy_rules (
  -- Primary Key
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id           UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Policy Scope
  leave_type_id             UUID REFERENCES leave_types(id),
  department_id             UUID,
  role_type                 VARCHAR(50),
  
  -- Service Requirements
  min_service_months        INTEGER DEFAULT 0,
  probation_period_months   INTEGER DEFAULT 3,
  
  -- Blackout Periods (JSON array of date ranges)
  blackout_periods          JSONB DEFAULT '[]'::jsonb,
  blackout_reason           TEXT,
  
  -- Concurrent Leave Limits
  max_concurrent_requests   INTEGER DEFAULT 1,
  max_dept_concurrent       INTEGER,
  min_staff_required        INTEGER,
  
  -- Replacement Rules
  requires_replacement      BOOLEAN DEFAULT false,
  replacement_same_role     BOOLEAN DEFAULT true,
  
  -- Critical Period Rules (JSON)
  critical_periods          JSONB DEFAULT '{}'::jsonb,
  critical_period_approval  VARCHAR(50), -- MANAGER, HR_ADMIN, DIRECTOR
  
  -- Notice Requirements
  override_notice_days      INTEGER,
  
  -- Approval Rules
  requires_manager_approval BOOLEAN DEFAULT true,
  requires_hr_approval      BOOLEAN DEFAULT false,
  requires_director_approval BOOLEAN DEFAULT false,
  auto_approve_threshold    INTEGER, -- Days below which auto-approve
  
  -- Status
  is_active                 BOOLEAN DEFAULT true,
  priority                  INTEGER DEFAULT 0,
  
  -- Audit
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by                VARCHAR(255),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by                VARCHAR(255)
);

-- =====================================================
-- LEAVE AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_audit_log (
  -- Primary Key
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id           UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Leave Request Reference
  leave_request_id          UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  
  -- Action Details
  action                    VARCHAR(50) NOT NULL, -- CREATED, SUBMITTED, APPROVED, REJECTED, CANCELLED, MODIFIED, DELEGATED
  old_status                VARCHAR(20),
  new_status                VARCHAR(20),
  
  -- Actor
  performed_by              UUID,
  performed_by_name         VARCHAR(255),
  performed_by_role         VARCHAR(50),
  
  -- Change Details
  field_changed             VARCHAR(100),
  old_value                 TEXT,
  new_value                 TEXT,
  
  -- Reason/Notes
  reason                    TEXT,
  notes                     TEXT,
  
  -- System Info
  ip_address                INET,
  user_agent                TEXT,
  
  -- Timestamp
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DEPARTMENT STAFFING RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS department_staffing_rules (
  -- Primary Key
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id           UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Department & Role
  department_id             UUID,
  department_name           VARCHAR(255),
  role_type                 VARCHAR(50),
  
  -- Staffing Requirements
  minimum_staff             INTEGER NOT NULL DEFAULT 1,
  critical_minimum          INTEGER NOT NULL DEFAULT 1,
  optimal_staff             INTEGER,
  
  -- Shift-Specific Rules (JSON)
  applies_to_shifts         JSONB DEFAULT '[]'::jsonb,
  
  -- Day-Specific Rules
  applies_to_days           VARCHAR(50)[], -- ['MONDAY', 'TUESDAY', etc.]
  weekend_minimum           INTEGER,
  holiday_minimum           INTEGER,
  
  -- Enforcement
  enforce_strict            BOOLEAN DEFAULT true,
  allow_manager_override    BOOLEAN DEFAULT false,
  
  -- Status
  is_active                 BOOLEAN DEFAULT true,
  effective_from            DATE,
  effective_to              DATE,
  
  -- Audit
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by                VARCHAR(255),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by                VARCHAR(255)
);

-- =====================================================
-- LEAVE APPROVAL WORKFLOW TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_approval_workflow (
  -- Primary Key
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id           UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Workflow Scope
  leave_type_id             UUID REFERENCES leave_types(id),
  department_id             UUID,
  days_threshold            INTEGER DEFAULT 0,
  
  -- Approval Level
  approval_level            INTEGER NOT NULL DEFAULT 1,
  level_name                VARCHAR(100),
  
  -- Approver Definition
  approver_role             VARCHAR(50), -- MANAGER, HR_ADMIN, DIRECTOR, DEPARTMENT_HEAD
  approver_id               UUID,
  approver_name             VARCHAR(255),
  
  -- Rules
  is_required               BOOLEAN DEFAULT true,
  can_delegate              BOOLEAN DEFAULT false,
  auto_approve_conditions   JSONB,
  
  -- Timing
  max_approval_hours        INTEGER DEFAULT 48,
  escalation_hours          INTEGER DEFAULT 72,
  escalate_to_role          VARCHAR(50),
  
  -- Sequence
  sequence_order            INTEGER DEFAULT 1,
  parallel_approval         BOOLEAN DEFAULT false,
  
  -- Status
  is_active                 BOOLEAN DEFAULT true,
  
  -- Audit
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by                VARCHAR(255),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by                VARCHAR(255)
);

-- =====================================================
-- LEAVE REQUEST APPROVALS TABLE (Track Individual Approvals)
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_request_approvals (
  -- Primary Key
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization
  organization_id           UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  
  -- Leave Request Reference
  leave_request_id          UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
  
  -- Approval Level
  approval_level            INTEGER NOT NULL,
  level_name                VARCHAR(100),
  
  -- Approver
  approver_id               UUID,
  approver_name             VARCHAR(255),
  approver_role             VARCHAR(50),
  
  -- Decision
  status                    VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, DELEGATED
  decision_date             TIMESTAMP WITH TIME ZONE,
  comments                  TEXT,
  rejection_reason          TEXT,
  
  -- Delegation
  delegated_to              UUID,
  delegated_to_name         VARCHAR(255),
  delegated_at              TIMESTAMP WITH TIME ZONE,
  
  -- Timing
  assigned_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  due_date                  TIMESTAMP WITH TIME ZONE,
  
  -- Audit
  created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Leave Policy Rules Indexes
CREATE INDEX IF NOT EXISTS idx_policy_rules_leave_type ON leave_policy_rules(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_department ON leave_policy_rules(department_id);
CREATE INDEX IF NOT EXISTS idx_policy_rules_active ON leave_policy_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_policy_rules_org ON leave_policy_rules(organization_id);

-- Leave Audit Log Indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_request ON leave_audit_log(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON leave_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON leave_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON leave_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON leave_audit_log(organization_id);

-- Department Staffing Rules Indexes
CREATE INDEX IF NOT EXISTS idx_staffing_rules_department ON department_staffing_rules(department_id);
CREATE INDEX IF NOT EXISTS idx_staffing_rules_role ON department_staffing_rules(role_type);
CREATE INDEX IF NOT EXISTS idx_staffing_rules_active ON department_staffing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_staffing_rules_org ON department_staffing_rules(organization_id);

-- Leave Approval Workflow Indexes
CREATE INDEX IF NOT EXISTS idx_approval_workflow_leave_type ON leave_approval_workflow(leave_type_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_department ON leave_approval_workflow(department_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_level ON leave_approval_workflow(approval_level);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_active ON leave_approval_workflow(is_active);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_org ON leave_approval_workflow(organization_id);

-- Leave Request Approvals Indexes
CREATE INDEX IF NOT EXISTS idx_request_approvals_request ON leave_request_approvals(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_request_approvals_approver ON leave_request_approvals(approver_id);
CREATE INDEX IF NOT EXISTS idx_request_approvals_status ON leave_request_approvals(status);
CREATE INDEX IF NOT EXISTS idx_request_approvals_level ON leave_request_approvals(approval_level);
CREATE INDEX IF NOT EXISTS idx_request_approvals_org ON leave_request_approvals(organization_id);

-- =====================================================
-- TRIGGER: Auto-create audit log entry on leave request changes
-- =====================================================
CREATE OR REPLACE FUNCTION log_leave_request_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log status changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO leave_audit_log (
      leave_request_id,
      action,
      old_status,
      new_status,
      performed_by,
      performed_by_name,
      notes
    ) VALUES (
      NEW.id,
      CASE 
        WHEN NEW.status = 'APPROVED' THEN 'APPROVED'
        WHEN NEW.status = 'REJECTED' THEN 'REJECTED'
        WHEN NEW.status = 'CANCELLED' THEN 'CANCELLED'
        ELSE 'MODIFIED'
      END,
      OLD.status,
      NEW.status,
      NEW.updated_by::UUID,
      NEW.approved_by_name,
      CASE 
        WHEN NEW.status = 'REJECTED' THEN NEW.rejection_reason
        ELSE NULL
      END
    );
  END IF;
  
  -- Log creation
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO leave_audit_log (
      leave_request_id,
      action,
      new_status,
      performed_by,
      performed_by_name,
      notes
    ) VALUES (
      NEW.id,
      'CREATED',
      NEW.status,
      NEW.created_by::UUID,
      NEW.employee_name,
      NEW.reason
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_leave_changes ON leave_requests;

CREATE TRIGGER trg_log_leave_changes
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION log_leave_request_changes();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE leave_policy_rules IS 'Business rules and policies for leave management';
COMMENT ON TABLE leave_audit_log IS 'Complete audit trail of all leave request changes';
COMMENT ON TABLE department_staffing_rules IS 'Minimum staffing requirements by department and role';
COMMENT ON TABLE leave_approval_workflow IS 'Multi-level approval workflow configuration';
COMMENT ON TABLE leave_request_approvals IS 'Individual approval records for each leave request';
