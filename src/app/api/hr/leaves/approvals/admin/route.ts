import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: NextRequest) {
  try {
    // Get ALL pending leave requests (admin view)
    const result = await pool.query(
      `
        SELECT 
          lr.id as leave_request_id,
          lr.employee_id,
          lr.employee_name,
          lr.employee_number,
          lr.leave_type_code,
          lt.name as leave_type_name,
          lr.start_date,
          lr.end_date,
          lr.working_days_count,
          lr.reason,
          lr.created_at,
          COALESCE(lra.approval_level, 1) as approval_level,
          COALESCE(lra.level_name, 'Manager Approval') as level_name,
          COALESCE(lra.approver_id, '00000000-0000-0000-0000-000000000001') as approver_id,
          COALESCE(lra.approver_name, 'System Admin') as approver_name,
          COALESCE(lra.status, 'PENDING') as approval_status,
          COALESCE(lra.assigned_at, lr.created_at) as assigned_at,
          COALESCE(lra.due_date, lr.created_at::timestamp + interval '48 hours') as due_date
        FROM leave_requests lr
        LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
        LEFT JOIN leave_request_approvals lra ON lr.id = lra.leave_request_id AND lra.approval_level = 1
        WHERE lr.status = 'PENDING'
        ORDER BY lr.start_date
      `
    );
    
    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      metadata: {
        view: 'admin_all_pending',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error: any) {
    console.error('Error fetching admin approvals:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch admin approvals',
    }, { status: 500 });
  }
}
