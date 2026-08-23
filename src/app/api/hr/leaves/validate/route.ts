import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import policyEngine from '@/lib/services/leave-policy-engine';
import scheduleConflicts from '@/lib/services/schedule-conflict-checker';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, leave_type_id, start_date, end_date, days_requested } = body;
    
    if (!employee_id || !leave_type_id || !start_date || !end_date || !days_requested) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
      }, { status: 400 });
    }

    // These handlers take an employee id from the client and pass it to
    // services that read that employee's schedule and leave history. The
    // services are keyed by id alone, so the facility check has to happen
    // here.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const owns = await pool.query(
      'SELECT 1 FROM staff WHERE staffid = $1 AND workspaceid = $2',
      [employee_id, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }
    
    // Validate policy rules
    const policyValidation = await policyEngine.validateCompleteLeaveRequest(
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      days_requested
    );
    
    // Check schedule conflicts
    const conflictValidation = await scheduleConflicts.validateLeaveRequest(
      employee_id,
      start_date,
      end_date
    );
    
    // Combine results
    const result = {
      is_valid: policyValidation.is_valid && conflictValidation.is_valid,
      can_proceed: policyValidation.can_proceed && conflictValidation.is_valid,
      requires_special_approval: policyValidation.requires_special_approval || conflictValidation.conflicts.requires_manager_approval,
      
      policy_validation: {
        is_valid: policyValidation.is_valid,
        violations: policyValidation.violations,
        warnings: policyValidation.warnings,
        info: policyValidation.info,
      },
      
      conflict_validation: {
        has_conflicts: conflictValidation.conflicts.has_conflicts,
        critical_conflicts: conflictValidation.conflicts.critical_conflicts,
        warnings: conflictValidation.conflicts.warnings,
        total_shifts_affected: conflictValidation.conflicts.total_shifts_affected,
      },
      
      staffing_impact: conflictValidation.staffing_impact,
      existing_leave: conflictValidation.existing_leave,
      recommendations: conflictValidation.recommendations,
    };
    
    return NextResponse.json({
      success: true,
      data: result,
    });
    
    });
  } catch (error: any) {
    console.error('Error validating leave request:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to validate leave request',
    }, { status: 500 });
  }
}
