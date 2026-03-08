import { NextRequest, NextResponse } from 'next/server';
import approvalWorkflow from '@/lib/services/leave-approval-workflow';
import attendanceIntegration from '@/lib/services/attendance-leave-integration';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { approver_id, approver_name, comments } = body;
    
    if (!approver_id || !approver_name) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: approver_id, approver_name',
      }, { status: 400 });
    }
    
    const result = await approvalWorkflow.approveLeaveRequest(
      params.id,
      approver_id,
      approver_name,
      comments
    );
    
    // If workflow is complete and approved, update attendance
    if (result.is_complete && result.final_status === 'APPROVED') {
      // Get leave request details
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      
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
        [params.id]
      );
      
      if (leaveResult.rows.length > 0) {
        await attendanceIntegration.updateAttendanceForApprovedLeave(
          leaveResult.rows[0]
        );
      }
      
      await pool.end();
    }
    
    return NextResponse.json({
      success: true,
      data: result,
      message: result.message,
    });
    
  } catch (error: any) {
    console.error('Error approving leave request:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to approve leave request',
    }, { status: 500 });
  }
}
