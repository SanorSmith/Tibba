import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

// Helper function to calculate working days
async function calculateWorkingDays(pool: Pool, startDate: string, endDate: string): Promise<number> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;

  // Get holidays in the date range
  const holidays = await pool.query(`
    SELECT date FROM holidays 
    WHERE date >= $1 AND date <= $2 AND is_active = true
  `, [startDate, endDate]);

  const holidayDates = new Set(holidays.rows.map(h => h.date.toISOString().split('T')[0]));

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

// Generate request number
function generateRequestNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LR-${year}-${random}`;
}

export async function GET(request: NextRequest) {
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

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
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

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

    await pool.end();

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching leave requests:', error);
    await pool.end();
    
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
  const databaseUrl = process.env.OPENEHR_DATABASE_URL;

  if (!databaseUrl) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

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
      SELECT * FROM leave_types WHERE id = $1
    `, [leave_type_id]);

    if (leaveType.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        { error: 'Invalid leave type' },
        { status: 400 }
      );
    }

    const leaveTypeData = leaveType.rows[0];

    // Validate consecutive days
    if (leaveTypeData.max_consecutive && totalDays > leaveTypeData.max_consecutive) {
      await pool.end();
      return NextResponse.json(
        { error: `Maximum consecutive days for ${leaveTypeData.name} is ${leaveTypeData.max_consecutive}` },
        { status: 400 }
      );
    }

    // Check if employee has sufficient balance
    const currentYear = new Date().getFullYear();
    const balance = await pool.query(`
      SELECT * FROM leave_balances 
      WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3
    `, [employee_id, leave_type_id, currentYear]);

    if (balance.rows.length > 0) {
      const availableBalance = balance.rows[0].closing_balance - balance.rows[0].pending;
      if (totalDays > availableBalance) {
        await pool.end();
        return NextResponse.json(
          { error: `Insufficient leave balance. Available: ${availableBalance} days, Requested: ${totalDays} days` },
          { status: 400 }
        );
      }
    }

    // Generate request number
    const requestNumber = generateRequestNumber();

    // Insert leave request
    const result = await pool.query(`
      INSERT INTO leave_requests (
        request_number, employee_id, leave_type_id, start_date, end_date,
        total_days, reason, emergency_contact, emergency_phone, handover_to,
        attachment_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'PENDING')
      RETURNING *
    `, [
      requestNumber,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      totalDays,
      reason || null,
      emergency_contact || null,
      emergency_phone || null,
      handover_to || null,
      attachment_url || null
    ]);

    // Update pending balance
    await pool.query(`
      UPDATE leave_balances 
      SET pending = pending + $1, updated_at = NOW()
      WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4
    `, [totalDays, employee_id, leave_type_id, currentYear]);

    // Create approval record for level 1
    const employee = await pool.query(`
      SELECT reporting_to FROM staff WHERE staffid = $1
    `, [employee_id]);

    if (employee.rows.length > 0 && employee.rows[0].reporting_to) {
      await pool.query(`
        INSERT INTO leave_approvals (
          leave_request_id, approver_id, approval_level, status
        ) VALUES ($1, $2, 1, 'PENDING')
      `, [result.rows[0].id, employee.rows[0].reporting_to]);
    }

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Leave request submitted successfully',
      data: result.rows[0]
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating leave request:', error);
    await pool.end();
    
    return NextResponse.json(
      { 
        error: 'Failed to create leave request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
