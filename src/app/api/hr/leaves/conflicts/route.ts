import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getWorkspaceId } from '@/lib/workspace';
import scheduleConflicts from '@/lib/services/schedule-conflict-checker';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: employee_id, start_date, end_date',
      }, { status: 400 });
    }

    // These handlers take an employee id from the client and pass it to
    // services that read that employee's schedule and leave history. The
    // services are keyed by id alone, so the facility check has to happen
    // here.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const owns = await pool.query(
      'SELECT 1 FROM staff WHERE staffid = $1 AND workspaceid = $2',
      [employeeId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }
    
    const conflicts = await scheduleConflicts.checkScheduleConflicts(
      employeeId,
      startDate,
      endDate
    );
    
    return NextResponse.json({
      success: true,
      data: conflicts,
    });
    
  } catch (error: any) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to check conflicts',
    }, { status: 500 });
  }
}
