import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';

// Helper function to calculate working days
async function calculateWorkingDays(pool: Pool, startDate: string, endDate: string): Promise<number> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;

  // Get holidays in the date range (table: official_holidays)
  let holidayDates = new Set<string>();
  try {
    const holidays = await pool.query(`
      SELECT date FROM official_holidays
      WHERE date >= $1 AND date <= $2 AND is_active = true
    `, [startDate, endDate]);
    holidayDates = new Set(holidays.rows.map((h: any) => h.date.toISOString().split('T')[0]));
  } catch {
    // official_holidays table not available — skip holiday exclusion
  }

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split('T')[0];
    
    // Skip Fridays (6) and holidays
    if (dayOfWeek !== 5 && !holidayDates.has(dateStr)) {
      workingDays++;
    }
  }

  return workingDays;
}


export async function GET(request: NextRequest) {
  // Leave requests are facility-private.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }


  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = `
      SELECT 
        lr.id,
        lr.request_number,
        lr.employee_id,
        s.firstname || ' ' || s.lastname as employee_name,
        s.unit as department,
        lt.id as leave_type_id,
        lt.name as leave_type,
        lt.code as leave_type_code,
        lt.color as leave_type_color,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.emergency_contact,
        lr.emergency_phone,
        lr.handover_to,
        lr.attachment_url,
        lr.status,
        lr.requested_at,
        lr.created_at,
        lr.updated_at
      FROM leave_requests lr
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN staff s ON lr.employee_id = s.staffid
      WHERE lr.workspaceid = $1
    `;

    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (employeeId) {
      query += ` AND lr.employee_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    }

    if (status) {
      query += ` AND lr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND lr.start_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND lr.end_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY lr.requested_at DESC`;

    const result = await pool.query(query, params);


    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch leave requests',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // A request may only be filed for this facility's own employee.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }


  try {
    const body = await request.json();
    const {
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      reason,
      emergency_contact,
      emergency_phone,
      handover_to,
      attachment_url
    } = body;

    if (!employee_id || !leave_type_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields: employee_id, leave_type_id, start_date, end_date' },
        { status: 400 }
      );
    }

    // The employee must be ours, otherwise a request for another facility's
    // staff would be filed under this facility.
    const emp = await pool.query(
      'SELECT 1 FROM staff WHERE staffid = $1 AND workspaceid = $2',
      [employee_id, workspaceId]
    );
    if (emp.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Validate dates
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    
    if (endDateObj < startDateObj) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Calculate working days
    const totalDays = await calculateWorkingDays(pool, start_date, end_date);

    // Get leave type details
    const leaveType = await pool.query(`
      SELECT * FROM leave_types WHERE id = $1 AND workspaceid = $2
    `, [leave_type_id, workspaceId]);

    if (leaveType.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid leave type' },
        { status: 400 }
      );
    }

    const leaveTypeData = leaveType.rows[0];

    // Validate consecutive days
    const maxConsecutive = leaveTypeData.max_consecutive_days ?? leaveTypeData.max_consecutive;
    if (maxConsecutive && totalDays > maxConsecutive) {
      return NextResponse.json(
        { error: `Maximum consecutive days for ${leaveTypeData.name} is ${maxConsecutive}` },
        { status: 400 }
      );
    }

    // Check if employee has sufficient balance
    const currentYear = new Date().getFullYear();
    const balance = await pool.query(`
      SELECT * FROM leave_balance
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
        AND workspaceid = $4
    `, [employee_id, leave_type_id, currentYear, workspaceId]);

    if (balance.rows.length > 0) {
      const availableBalance = balance.rows[0].available_balance ?? 0;
      if (totalDays > availableBalance) {
        return NextResponse.json(
          { error: `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${totalDays} days` },
          { status: 400 }
        );
      }
    }

    // Insert leave request (mapped to real leave_requests schema)
    const result = await pool.query(`
      INSERT INTO leave_requests (
        organization_id, employee_id, leave_type_id, start_date, end_date,
        days_count, reason, emergency_contact, handover_notes, status, workspaceid
      ) VALUES ('00000000-0000-0000-0000-000000000001', $1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
      RETURNING *
    `, [
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      totalDays,
      reason || null,
      emergency_contact || null,
      handover_to || null,
      workspaceId
    ]);

    // Create level-1 approval record
    try {
      await pool.query(`
        INSERT INTO leave_request_approvals (
          organization_id, leave_request_id, approval_level, status, workspaceid
        ) VALUES ('00000000-0000-0000-0000-000000000001', $1, 1, 'PENDING', $2)
      `, [result.rows[0].id, workspaceId]);
    } catch {
      // non-fatal — approval record creation is best-effort
    }


    return NextResponse.json({
      success: true,
      message: 'Leave request submitted successfully',
      data: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating leave request:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create leave request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
