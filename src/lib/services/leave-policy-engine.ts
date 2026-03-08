import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// TYPES
// =====================================================

export interface PolicyViolation {
  rule: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  can_override: boolean;
  override_role?: string;
}

export interface PolicyValidationResult {
  is_valid: boolean;
  violations: PolicyViolation[];
  warnings: PolicyViolation[];
  info: PolicyViolation[];
  can_proceed: boolean;
  requires_special_approval: boolean;
}

// =====================================================
// VALIDATE LEAVE REQUEST AGAINST POLICIES
// =====================================================

export async function validateLeavePolicy(
  employeeId: string,
  leaveTypeId: string,
  startDate: string,
  endDate: string,
  daysRequested: number
): Promise<PolicyValidationResult> {
  const result: PolicyValidationResult = {
    is_valid: true,
    violations: [],
    warnings: [],
    info: [],
    can_proceed: true,
    requires_special_approval: false,
  };

  try {
    // Get employee details
    const empResult = await pool.query(
      `SELECT 
        staffid,
        firstname,
        lastname,
        unit as department,
        role,
        date_joined,
        status
       FROM staff
       WHERE staffid = $1`,
      [employeeId]
    );

    if (empResult.rows.length === 0) {
      result.violations.push({
        rule: 'EMPLOYEE_EXISTS',
        severity: 'ERROR',
        message: 'Employee not found',
        can_override: false,
      });
      result.is_valid = false;
      result.can_proceed = false;
      return result;
    }

    const employee = empResult.rows[0];

    // Get leave type details
    const leaveTypeResult = await pool.query(
      `SELECT * FROM leave_types WHERE id = $1`,
      [leaveTypeId]
    );

    if (leaveTypeResult.rows.length === 0) {
      result.violations.push({
        rule: 'LEAVE_TYPE_EXISTS',
        severity: 'ERROR',
        message: 'Leave type not found',
        can_override: false,
      });
      result.is_valid = false;
      result.can_proceed = false;
      return result;
    }

    const leaveType = leaveTypeResult.rows[0];

    // Get applicable policy rules
    const policyResult = await pool.query(
      `SELECT * FROM leave_policy_rules
       WHERE (leave_type_id = $1 OR leave_type_id IS NULL)
       AND (department_id = $2 OR department_id IS NULL)
       AND (role_type = $3 OR role_type IS NULL)
       AND is_active = true
       ORDER BY priority DESC`,
      [leaveTypeId, employee.department, employee.role]
    );

    const policies = policyResult.rows;

    // 1. Check minimum service requirement
    if (employee.date_joined) {
      const joinDate = new Date(employee.date_joined);
      const now = new Date();
      const monthsOfService = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

      for (const policy of policies) {
        if (policy.min_service_months && monthsOfService < policy.min_service_months) {
          result.violations.push({
            rule: 'MIN_SERVICE_REQUIREMENT',
            severity: 'ERROR',
            message: `Minimum ${policy.min_service_months} months of service required. Current: ${Math.floor(monthsOfService)} months`,
            can_override: false,
          });
          result.is_valid = false;
          result.can_proceed = false;
        }

        if (policy.probation_period_months && monthsOfService < policy.probation_period_months) {
          result.warnings.push({
            rule: 'PROBATION_PERIOD',
            severity: 'WARNING',
            message: `Employee is in probation period (${policy.probation_period_months} months)`,
            can_override: true,
            override_role: 'HR_ADMIN',
          });
          result.requires_special_approval = true;
        }
      }
    }

    // 2. Check blackout periods
    for (const policy of policies) {
      if (policy.blackout_periods && Array.isArray(policy.blackout_periods)) {
        for (const blackout of policy.blackout_periods) {
          const blackoutStart = new Date(blackout.start_date);
          const blackoutEnd = new Date(blackout.end_date);
          const requestStart = new Date(startDate);
          const requestEnd = new Date(endDate);

          if (
            (requestStart >= blackoutStart && requestStart <= blackoutEnd) ||
            (requestEnd >= blackoutStart && requestEnd <= blackoutEnd) ||
            (requestStart <= blackoutStart && requestEnd >= blackoutEnd)
          ) {
            result.violations.push({
              rule: 'BLACKOUT_PERIOD',
              severity: 'ERROR',
              message: `Leave request falls within blackout period: ${blackout.reason || policy.blackout_reason || 'Critical period'}`,
              can_override: true,
              override_role: 'DIRECTOR',
            });
            result.is_valid = false;
            result.requires_special_approval = true;
          }
        }
      }
    }

    // 3. Check concurrent leave requests
    for (const policy of policies) {
      if (policy.max_concurrent_requests) {
        const concurrentResult = await pool.query(
          `SELECT COUNT(*) as count
           FROM leave_requests
           WHERE employee_id = $1
           AND status IN ('PENDING', 'APPROVED')
           AND (
             (start_date BETWEEN $2 AND $3)
             OR (end_date BETWEEN $2 AND $3)
             OR (start_date <= $2 AND end_date >= $3)
           )`,
          [employeeId, startDate, endDate]
        );

        const concurrentCount = parseInt(concurrentResult.rows[0].count);
        if (concurrentCount >= policy.max_concurrent_requests) {
          result.violations.push({
            rule: 'MAX_CONCURRENT_REQUESTS',
            severity: 'ERROR',
            message: `Maximum ${policy.max_concurrent_requests} concurrent leave request(s) allowed`,
            can_override: false,
          });
          result.is_valid = false;
          result.can_proceed = false;
        }
      }
    }

    // 4. Check notice period
    const noticeRequired = leaveType.notice_days || 0;
    const requestDate = new Date();
    const leaveStartDate = new Date(startDate);
    const daysNotice = Math.floor((leaveStartDate.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysNotice < noticeRequired) {
      result.warnings.push({
        rule: 'NOTICE_PERIOD',
        severity: 'WARNING',
        message: `Minimum ${noticeRequired} days notice required. Current: ${daysNotice} days`,
        can_override: true,
        override_role: 'MANAGER',
      });
      result.requires_special_approval = true;
    }

    // 5. Check maximum consecutive days
    if (leaveType.max_consecutive_days && daysRequested > leaveType.max_consecutive_days) {
      result.violations.push({
        rule: 'MAX_CONSECUTIVE_DAYS',
        severity: 'ERROR',
        message: `Maximum ${leaveType.max_consecutive_days} consecutive days allowed for ${leaveType.name}`,
        can_override: true,
        override_role: 'HR_ADMIN',
      });
      result.is_valid = false;
      result.requires_special_approval = true;
    }

    // 6. Check replacement requirement
    for (const policy of policies) {
      if (policy.requires_replacement) {
        result.info.push({
          rule: 'REPLACEMENT_REQUIRED',
          severity: 'INFO',
          message: 'Replacement employee required for this leave request',
          can_override: false,
        });
      }
    }

    // 7. Check critical periods
    for (const policy of policies) {
      if (policy.critical_periods && typeof policy.critical_periods === 'object') {
        const criticalPeriods = policy.critical_periods as any;
        for (const period in criticalPeriods) {
          const periodData = criticalPeriods[period];
          if (periodData.start_date && periodData.end_date) {
            const criticalStart = new Date(periodData.start_date);
            const criticalEnd = new Date(periodData.end_date);
            const requestStart = new Date(startDate);
            const requestEnd = new Date(endDate);

            if (
              (requestStart >= criticalStart && requestStart <= criticalEnd) ||
              (requestEnd >= criticalStart && requestEnd <= criticalEnd)
            ) {
              result.warnings.push({
                rule: 'CRITICAL_PERIOD',
                severity: 'WARNING',
                message: `Leave request during critical period: ${periodData.reason || period}`,
                can_override: true,
                override_role: policy.critical_period_approval || 'DIRECTOR',
              });
              result.requires_special_approval = true;
            }
          }
        }
      }
    }

    // 8. Check leave balance
    const balanceResult = await pool.query(
      `SELECT 
        accrued,
        used,
        available_balance
       FROM leave_balance
       WHERE employee_id = $1
       AND leave_type_id = $2
       AND year = EXTRACT(YEAR FROM $3::date)`,
      [employeeId, leaveTypeId, startDate]
    );

    if (balanceResult.rows.length > 0) {
      const balance = balanceResult.rows[0];
      if (balance.available_balance < daysRequested) {
        if (leaveType.is_paid) {
          result.violations.push({
            rule: 'INSUFFICIENT_BALANCE',
            severity: 'ERROR',
            message: `Insufficient leave balance. Available: ${balance.available_balance} days, Requested: ${daysRequested} days`,
            can_override: true,
            override_role: 'HR_ADMIN',
          });
          result.is_valid = false;
          result.requires_special_approval = true;
        } else {
          result.info.push({
            rule: 'UNPAID_LEAVE',
            severity: 'INFO',
            message: 'This will be unpaid leave',
            can_override: false,
          });
        }
      }
    } else if (leaveType.is_paid) {
      result.warnings.push({
        rule: 'NO_BALANCE_RECORD',
        severity: 'WARNING',
        message: 'No leave balance record found. Balance will be created.',
        can_override: false,
      });
    }

    // Final determination
    if (result.violations.length > 0) {
      result.can_proceed = result.violations.every(v => v.can_override);
    }

    return result;

  } catch (error: any) {
    console.error('❌ Error validating leave policy:', error);
    result.violations.push({
      rule: 'SYSTEM_ERROR',
      severity: 'ERROR',
      message: `System error: ${error.message}`,
      can_override: false,
    });
    result.is_valid = false;
    result.can_proceed = false;
    return result;
  }
}

// =====================================================
// CHECK DEPARTMENT LEAVE LIMITS
// =====================================================

export async function checkDepartmentLeaveLimit(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<PolicyViolation[]> {
  const violations: PolicyViolation[] = [];

  try {
    // Get employee's department
    const empResult = await pool.query(
      `SELECT unit as department FROM staff WHERE staffid = $1`,
      [employeeId]
    );

    if (empResult.rows.length === 0) {
      return violations;
    }

    const department = empResult.rows[0].department;

    // Get policy rules for department
    const policyResult = await pool.query(
      `SELECT max_dept_concurrent
       FROM leave_policy_rules
       WHERE (department_id = $1 OR department_id IS NULL)
       AND max_dept_concurrent IS NOT NULL
       AND is_active = true
       ORDER BY priority DESC
       LIMIT 1`,
      [department]
    );

    if (policyResult.rows.length === 0) {
      return violations;
    }

    const maxConcurrent = policyResult.rows[0].max_dept_concurrent;

    // Count concurrent leaves in department
    const concurrentResult = await pool.query(
      `SELECT COUNT(DISTINCT lr.employee_id) as count
       FROM leave_requests lr
       LEFT JOIN staff s ON lr.employee_id = s.staffid
       WHERE s.unit = $1
       AND lr.status = 'APPROVED'
       AND (
         (lr.start_date BETWEEN $2 AND $3)
         OR (lr.end_date BETWEEN $2 AND $3)
         OR (lr.start_date <= $2 AND lr.end_date >= $3)
       )`,
      [department, startDate, endDate]
    );

    const concurrentCount = parseInt(concurrentResult.rows[0].count);

    if (concurrentCount >= maxConcurrent) {
      violations.push({
        rule: 'DEPT_MAX_CONCURRENT',
        severity: 'ERROR',
        message: `Department ${department} has reached maximum concurrent leaves (${maxConcurrent})`,
        can_override: true,
        override_role: 'DIRECTOR',
      });
    }

    return violations;

  } catch (error: any) {
    console.error('❌ Error checking department leave limit:', error);
    return violations;
  }
}

// =====================================================
// VALIDATE COMPLETE LEAVE REQUEST
// =====================================================

export async function validateCompleteLeaveRequest(
  employeeId: string,
  leaveTypeId: string,
  startDate: string,
  endDate: string,
  daysRequested: number
): Promise<PolicyValidationResult> {
  const policyResult = await validateLeavePolicy(
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    daysRequested
  );

  const deptViolations = await checkDepartmentLeaveLimit(
    employeeId,
    startDate,
    endDate
  );

  policyResult.violations.push(...deptViolations);

  if (deptViolations.length > 0) {
    policyResult.is_valid = false;
    policyResult.requires_special_approval = true;
  }

  return policyResult;
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  validateLeavePolicy,
  checkDepartmentLeaveLimit,
  validateCompleteLeaveRequest,
};
