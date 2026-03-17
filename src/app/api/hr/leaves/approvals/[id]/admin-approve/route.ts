import { NextRequest, NextResponse } from 'next/server';
import approvalWorkflow from '@/lib/services/leave-approval-workflow';
import attendanceIntegration from '@/lib/services/attendance-leave-integration';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { id } = await params;
    const { approver_id, approver_name, comments } = body;
    
    if (!approver_id || !approver_name) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: approver_id, approver_name',
      }, { status: 400 });
    }
    
    // Admin override - check if user is admin
    const { Pool } = require('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Get user role to verify admin privileges
    const userResult = await pool.query(
      'SELECT role FROM staff WHERE staffid = $1',
      [approver_id]
    );
    
    const isAdmin = userResult.rows.length > 0 && 
      ['HR_ADMIN', 'Administrator'].includes(userResult.rows[0].role);
    
    if (!isAdmin) {
      await pool.end();
      return NextResponse.json({
        success: false,
        error: 'Admin privileges required for this action',
      }, { status: 403 });
    }
    
    // Find the actual approver for this request
    const approvalResult = await pool.query(
      `SELECT 
        approver_id,
        approver_name,
        approval_level,
        level_name
       FROM leave_request_approvals
       WHERE leave_request_id = $1
       AND status = 'PENDING'
       ORDER BY approval_level
       LIMIT 1`,
      [id]
    );
    
    if (approvalResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({
        success: false,
        error: 'No pending approval found for this request',
      }, { status: 404 });
    }
    
    const actualApprover = approvalResult.rows[0];
    
    // Use admin override to approve with the actual approver's ID
    const result = await approvalWorkflow.approveLeaveRequest(
      id,
      actualApprover.approver_id, // Use the assigned approver's ID
      `${approver_name} (Admin Override)`, // Mark as admin override
      comments
    );
    
    // If workflow is complete and approved, update attendance
    if (result.is_complete && result.final_status === 'APPROVED') {
      // Get leave request details
      const leaveResult = await pool.query(
        `SELECT 
          id,
          employee_id,
          leave_type_code,
          start_date,
          end_date,
          return_date,
          working_days_count,
          status
         FROM leave_requests
         WHERE id = $1`,
        [id]
      );
      
      if (leaveResult.rows.length > 0) {
        await attendanceIntegration.updateAttendanceForApprovedLeave(
          leaveResult.rows[0]
        );
      }
    }
    
    await pool.end();
    
    return NextResponse.json({
      success: true,
      data: result,
      message: `Leave request approved by admin (${approver_name})`,
      metadata: {
        admin_override: true,
        original_approver: actualApprover.approver_name,
        approved_by: approver_name
      }
    });
    
  } catch (error: any) {
    console.error('Error in admin approve:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to approve leave request',
    }, { status: 500 });
  }
}
