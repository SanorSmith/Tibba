import { NextRequest, NextResponse } from 'next/server';
import policyEngine from '@/lib/services/leave-policy-engine';
import scheduleConflicts from '@/lib/services/schedule-conflict-checker';

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
    
  } catch (error: any) {
    console.error('Error validating leave request:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to validate leave request',
    }, { status: 500 });
  }
}
