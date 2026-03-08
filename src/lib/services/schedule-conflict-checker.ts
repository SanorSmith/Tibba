import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// TYPES
// =====================================================

export interface ScheduleConflict {
  date: string;
  shift_id: string;
  shift_name: string;
  shift_code: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  reason: string;
  can_override: boolean;
}

export interface ConflictCheckResult {
  has_conflicts: boolean;
  critical_conflicts: ScheduleConflict[];
  warnings: ScheduleConflict[];
  info: ScheduleConflict[];
  total_shifts_affected: number;
  requires_manager_approval: boolean;
}

export interface StaffingImpact {
  date: string;
  department: string;
  scheduled_staff: number;
  minimum_required: number;
  after_leave: number;
  is_below_minimum: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'OK';
}

// =====================================================
// CHECK SCHEDULE CONFLICTS
// =====================================================

export async function checkScheduleConflicts(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<ConflictCheckResult> {
  try {
    const result: ConflictCheckResult = {
      has_conflicts: false,
      critical_conflicts: [],
      warnings: [],
      info: [],
      total_shifts_affected: 0,
      requires_manager_approval: false,
    };

    // Get all shift assignments in the date range
    const shiftsQuery = await pool.query(
      `SELECT 
        es.id,
        es.effective_date,
        es.shift_id,
        sh.name as shift_name,
        sh.code as shift_code,
        sh.is_night_shift,
        s.unit as department
       FROM employee_schedules es
       LEFT JOIN shifts sh ON es.shift_id = sh.id
       LEFT JOIN staff s ON es.employee_id = s.staffid
       WHERE es.employee_id = $1
       AND es.is_active = true
       AND es.status = 'ACTIVE'
       AND (
         (es.effective_date BETWEEN $2 AND $3)
         OR (es.end_date IS NULL AND es.effective_date <= $3)
         OR (es.end_date >= $2)
       )
       ORDER BY es.effective_date`,
      [employeeId, startDate, endDate]
    );

    result.total_shifts_affected = shiftsQuery.rows.length;

    // Check each shift for conflicts
    for (const shift of shiftsQuery.rows) {
      const conflict: ScheduleConflict = {
        date: shift.effective_date,
        shift_id: shift.shift_id,
        shift_name: shift.shift_name,
        shift_code: shift.shift_code,
        severity: 'INFO',
        reason: 'Scheduled shift during leave period',
        can_override: true,
      };

      // Check if it's a critical shift (night shift, ER, ICU, etc.)
      if (shift.is_night_shift) {
        conflict.severity = 'WARNING';
        conflict.reason = 'Night shift scheduled during leave period';
        result.warnings.push(conflict);
      } else {
        result.info.push(conflict);
      }

      // Check if department is critical
      const criticalDepts = ['Emergency', 'ICU', 'CCU', 'NICU', 'Operating Room'];
      if (criticalDepts.includes(shift.department)) {
        conflict.severity = 'CRITICAL';
        conflict.reason = `Critical department (${shift.department}) shift during leave`;
        conflict.can_override = false;
        result.critical_conflicts.push(conflict);
        result.requires_manager_approval = true;
      }
    }

    result.has_conflicts = result.total_shifts_affected > 0;

    return result;

  } catch (error: any) {
    console.error('❌ Error checking schedule conflicts:', error);
    throw error;
  }
}

// =====================================================
// CHECK DEPARTMENT STAFFING IMPACT
// =====================================================

export async function checkDepartmentStaffingImpact(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<StaffingImpact[]> {
  try {
    // Get employee's department
    const empResult = await pool.query(
      `SELECT unit as department FROM staff WHERE staffid = $1`,
      [employeeId]
    );

    if (empResult.rows.length === 0) {
      throw new Error('Employee not found');
    }

    const department = empResult.rows[0].department;

    // Get staffing rules for this department
    const rulesResult = await pool.query(
      `SELECT minimum_staff, critical_minimum
       FROM department_staffing_rules
       WHERE department_name = $1
       AND is_active = true
       LIMIT 1`,
      [department]
    );

    const minimumStaff = rulesResult.rows[0]?.minimum_staff || 1;
    const criticalMinimum = rulesResult.rows[0]?.critical_minimum || 1;

    // Generate date range
    const dates = generateDateRange(new Date(startDate), new Date(endDate));
    const impacts: StaffingImpact[] = [];

    for (const date of dates) {
      const dateStr = date.toISOString().split('T')[0];

      // Count scheduled staff for this department on this date
      const scheduledCount = await pool.query(
        `SELECT COUNT(DISTINCT es.employee_id) as count
         FROM employee_schedules es
         LEFT JOIN staff s ON es.employee_id = s.staffid
         WHERE s.unit = $1
         AND es.is_active = true
         AND es.status = 'ACTIVE'
         AND $2 BETWEEN es.effective_date AND COALESCE(es.end_date, '2099-12-31')`,
        [department, dateStr]
      );

      // Count staff on approved leave for this date
      const onLeaveCount = await pool.query(
        `SELECT COUNT(DISTINCT lr.employee_id) as count
         FROM leave_requests lr
         LEFT JOIN staff s ON lr.employee_id = s.staffid
         WHERE s.unit = $1
         AND lr.status = 'APPROVED'
         AND $2 BETWEEN lr.start_date AND lr.end_date`,
        [department, dateStr]
      );

      const scheduled = parseInt(scheduledCount.rows[0].count);
      const onLeave = parseInt(onLeaveCount.rows[0].count);
      const afterLeave = scheduled - onLeave - 1; // -1 for the new leave request

      let severity: 'CRITICAL' | 'WARNING' | 'OK' = 'OK';
      if (afterLeave < criticalMinimum) {
        severity = 'CRITICAL';
      } else if (afterLeave < minimumStaff) {
        severity = 'WARNING';
      }

      impacts.push({
        date: dateStr,
        department,
        scheduled_staff: scheduled,
        minimum_required: minimumStaff,
        after_leave: afterLeave,
        is_below_minimum: afterLeave < minimumStaff,
        severity,
      });
    }

    return impacts;

  } catch (error: any) {
    console.error('❌ Error checking staffing impact:', error);
    throw error;
  }
}

// =====================================================
// CHECK IF EMPLOYEE HAS APPROVED LEAVE
// =====================================================

export async function checkApprovedLeave(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<any | null> {
  try {
    const result = await pool.query(
      `SELECT 
        id,
        leave_type_code,
        start_date,
        end_date,
        return_date,
        status
       FROM leave_requests
       WHERE employee_id = $1
       AND status = 'APPROVED'
       AND (
         (start_date BETWEEN $2 AND $3)
         OR (end_date BETWEEN $2 AND $3)
         OR (start_date <= $2 AND end_date >= $3)
       )
       LIMIT 1`,
      [employeeId, startDate, endDate]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return null;
  } catch (error: any) {
    console.error('❌ Error checking approved leave:', error);
    return null;
  }
}

// =====================================================
// VALIDATE LEAVE REQUEST AGAINST SCHEDULE
// =====================================================

export async function validateLeaveRequest(
  employeeId: string,
  startDate: string,
  endDate: string
): Promise<{
  is_valid: boolean;
  conflicts: ConflictCheckResult;
  staffing_impact: StaffingImpact[];
  existing_leave: any | null;
  recommendations: string[];
}> {
  try {
    const conflicts = await checkScheduleConflicts(employeeId, startDate, endDate);
    const staffingImpact = await checkDepartmentStaffingImpact(employeeId, startDate, endDate);
    const existingLeave = await checkApprovedLeave(employeeId, startDate, endDate);

    const recommendations: string[] = [];

    // Generate recommendations
    if (existingLeave) {
      recommendations.push('Employee already has approved leave during this period');
    }

    if (conflicts.critical_conflicts.length > 0) {
      recommendations.push('Critical shift conflicts detected - requires director approval');
    }

    const criticalStaffing = staffingImpact.filter(s => s.severity === 'CRITICAL');
    if (criticalStaffing.length > 0) {
      recommendations.push(`Department will be below critical staffing on ${criticalStaffing.length} day(s)`);
    }

    if (conflicts.total_shifts_affected > 0) {
      recommendations.push(`${conflicts.total_shifts_affected} scheduled shift(s) will need coverage`);
    }

    const isValid = 
      !existingLeave &&
      conflicts.critical_conflicts.length === 0 &&
      criticalStaffing.length === 0;

    return {
      is_valid: isValid,
      conflicts,
      staffing_impact: staffingImpact,
      existing_leave: existingLeave,
      recommendations,
    };

  } catch (error: any) {
    console.error('❌ Error validating leave request:', error);
    throw error;
  }
}

// =====================================================
// HELPER: Generate Date Range
// =====================================================

function generateDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  checkScheduleConflicts,
  checkDepartmentStaffingImpact,
  checkApprovedLeave,
  validateLeaveRequest,
};
