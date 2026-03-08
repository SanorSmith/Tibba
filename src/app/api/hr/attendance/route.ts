import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// GET - Fetch attendance records with employee data
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employee_id');

    let query = `
      SELECT 
        da.id,
        da.employee_id,
        s.custom_staff_id as employee_number,
        s.firstname as first_name,
        s.lastname as last_name,
        s.unit as department_name,
        da.date,
        da.shift_id,
        sh.code as shift_code,
        sh.name as shift_name,
        da.first_in,
        da.last_out,
        da.total_hours,
        da.regular_hours,
        da.overtime_hours,
        da.late_arrival_minutes,
        da.status,
        da.created_at,
        da.updated_at,
        COALESCE(lr.status, null) as leave_status,
        COALESCE(lr.leave_type_code, null) as leave_type_code,
        lr.start_date as leave_start_date,
        lr.end_date as leave_end_date
      FROM daily_attendance da
      INNER JOIN staff s ON da.employee_id = s.staffid
      LEFT JOIN shifts sh ON da.shift_id = sh.id
      LEFT JOIN leave_requests lr ON 
        s.staffid = lr.employee_id AND 
        da.date BETWEEN lr.start_date AND COALESCE(lr.return_date, lr.end_date)
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (date) {
      query += ` AND da.date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }

    if (status) {
      query += ` AND da.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (employeeId) {
      query += ` AND s.custom_staff_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    }

    query += ' ORDER BY da.date DESC, s.firstname ASC';

    const result = await pool.query(query, params);

    // Format the response to match the UI expectations
    const formattedRecords = result.rows.map(row => {
      // Determine actual employee status based on attendance and leave
      let actualStatus = row.status;
      let statusDisplay = row.status;
      
      // If employee is on leave, override attendance status
      if (row.leave_status) {
        actualStatus = 'ON_LEAVE';
        statusDisplay = row.leave_status;
      }
      
      return {
        id: row.id,
        employee_id: row.employee_id, // Use staff UUID for links
        employee_number: row.employee_number, // Keep staff number for display
        employee_name: `${row.first_name} ${row.last_name}`,
        department_name: row.department_name,
        date: row.date.toISOString().split('T')[0],
        shift_id: row.shift_code,
        shift_name: row.shift_name,
        first_in: row.first_in ? new Date(row.first_in).toTimeString().slice(0, 5) : null,
        last_out: row.last_out ? new Date(row.last_out).toTimeString().slice(0, 5) : null,
        total_hours: parseFloat(row.total_hours) || 0,
        regular_hours: parseFloat(row.regular_hours) || 0,
        overtime_hours: parseFloat(row.overtime_hours) || 0,
        late_minutes: parseInt(row.late_arrival_minutes) || 0,
        status: statusDisplay,
        actual_status: actualStatus,
        leave_status: row.leave_status,
        leave_type_code: row.leave_type_code,
        leave_start_date: row.leave_start_date ? row.leave_start_date.toISOString().split('T')[0] : null,
        leave_end_date: row.leave_end_date ? row.leave_end_date.toISOString().split('T')[0] : null,
        is_on_leave: !!row.leave_status,
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedRecords,
      count: formattedRecords.length,
    });
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create new attendance record
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      date,
      shift_id,
      first_in,
      last_out,
      total_hours,
      regular_hours,
      overtime_hours,
      late_minutes,
      status,
    } = body;

    // Validate required fields
    if (!employee_id || !date || !shift_id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get staff UUID
    const staffResult = await pool.query(
      'SELECT staffid FROM staff WHERE custom_staff_id = $1 OR staffid::text = $1',
      [employee_id]
    );

    if (staffResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Staff member not found' },
        { status: 404 }
      );
    }

    const employeeUuid = staffResult.rows[0].staffid;

    // Get shift UUID
    const shiftResult = await pool.query(
      'SELECT id FROM shifts WHERE code = $1',
      [shift_id]
    );

    if (shiftResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Shift not found' },
        { status: 404 }
      );
    }

    const shiftUuid = shiftResult.rows[0].id;

    // Convert time strings to timestamps
    const firstInTimestamp = first_in ? `${date} ${first_in}:00` : null;
    const lastOutTimestamp = last_out ? `${date} ${last_out}:00` : null;

    const result = await pool.query(
      `INSERT INTO daily_attendance (
        employee_id, date, shift_id, first_in, last_out, total_hours,
        regular_hours, overtime_hours, late_arrival_minutes, status,
        organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        employeeUuid,
        date,
        shiftUuid,
        firstInTimestamp,
        lastOutTimestamp,
        total_hours || 0,
        regular_hours || 0,
        overtime_hours || 0,
        late_minutes || 0,
        status,
        '00000000-0000-0000-0000-000000000001',
      ]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id },
      message: 'Attendance record created successfully',
    });
  } catch (error: any) {
    console.error('Error creating attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
