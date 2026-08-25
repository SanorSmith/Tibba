import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


export async function GET(request: NextRequest) {
  const workspaceId = await getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {

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
        WHERE lr.status = 'PENDING' AND lr.workspaceid = $1
        ORDER BY lr.start_date
      `,
      [workspaceId]
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
  });
}
