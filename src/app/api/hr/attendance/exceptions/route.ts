import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// GET - Fetch attendance exceptions
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');
    const employeeId = searchParams.get('employee_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = `
      SELECT 
        ae.*,
        s.firstname || ' ' || s.lastname as full_employee_name,
        s.custom_staff_id as staff_number,
        s.unit as department_name,
        da.first_in,
        da.last_out,
        da.total_hours,
        da.status as attendance_status
      FROM attendance_exceptions ae
      LEFT JOIN staff s ON ae.employee_id = s.staffid
      LEFT JOIN daily_attendance da ON ae.daily_attendance_id = da.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      query += ` AND ae.review_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (severity && severity !== 'all') {
      query += ` AND ae.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (type && type !== 'all') {
      query += ` AND ae.exception_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (employeeId) {
      query += ` AND ae.employee_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND ae.exception_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND ae.exception_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ' ORDER BY ae.exception_date DESC, ae.created_at DESC';

    const result = await pool.query(query, params);

    // Format the response
    const formattedExceptions = result.rows.map(row => ({
      exception_id: row.id,
      employee_id: row.employee_id,
      employee_name: row.employee_name || row.full_employee_name,
      employee_number: row.employee_number || row.staff_number,
      department: row.department || row.department_name,
      exception_date: row.exception_date,
      exception_type: row.exception_type,
      details: row.details,
      severity: row.severity,
      minutes_late: row.minutes_late,
      minutes_early: row.minutes_early,
      review_status: row.review_status,
      justification: row.justification,
      justified_by: row.justified_by,
      justified_by_name: row.justified_by_name,
      justified_at: row.justified_at,
      warning_issued: row.warning_issued,
      warning_details: row.warning_details,
      auto_detected: row.auto_detected,
      created_at: row.created_at,
      attendance_status: row.attendance_status,
      first_in: row.first_in,
      last_out: row.last_out,
    }));

    return NextResponse.json({
      success: true,
      data: formattedExceptions,
      count: formattedExceptions.length,
    });
  } catch (error: any) {
    console.error('Error fetching attendance exceptions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create or detect attendance exceptions
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, date, employee_id, exception_data } = body;

    // Action: detect - Run auto-detection for a specific date
    if (action === 'detect') {
      const detectionDate = date || new Date().toISOString().split('T')[0];
      
      const result = await pool.query(
        'SELECT * FROM detect_attendance_exceptions($1::DATE)',
        [detectionDate]
      );

      return NextResponse.json({
        success: true,
        message: `Detected ${result.rows[0].exceptions_detected} exceptions for ${detectionDate}`,
        exceptions_detected: result.rows[0].exceptions_detected,
      });
    }

    // Action: create - Manually create an exception
    if (action === 'create' && exception_data) {
      const {
        employee_id,
        exception_date,
        exception_type,
        details,
        severity,
        minutes_late,
        minutes_early,
      } = exception_data;

      const result = await pool.query(
        `INSERT INTO attendance_exceptions (
          employee_id,
          exception_date,
          exception_type,
          details,
          severity,
          minutes_late,
          minutes_early,
          auto_detected
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false)
        RETURNING *`,
        [
          employee_id,
          exception_date,
          exception_type,
          details,
          severity || 'MEDIUM',
          minutes_late,
          minutes_early,
        ]
      );

      return NextResponse.json({
        success: true,
        message: 'Exception created successfully',
        data: result.rows[0],
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action or missing data' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error creating attendance exception:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Update attendance exception
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      exception_id,
      action,
      justification,
      justified_by,
      justified_by_name,
      warning_details,
      dismissal_reason,
      user_id,
      user_name,
    } = body;

    if (!exception_id) {
      return NextResponse.json(
        { success: false, error: 'Exception ID is required' },
        { status: 400 }
      );
    }

    let query = '';
    let params: any[] = [];

    // Action: justify
    if (action === 'justify') {
      query = `
        UPDATE attendance_exceptions 
        SET 
          review_status = 'JUSTIFIED',
          justification = $1,
          justified_by = $2,
          justified_by_name = $3,
          justified_at = NOW(),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      params = [justification, null, justified_by_name || user_name, exception_id];
    }

    // Action: issue_warning
    else if (action === 'issue_warning') {
      query = `
        UPDATE attendance_exceptions 
        SET 
          review_status = 'WARNING_ISSUED',
          warning_issued = true,
          warning_details = $1,
          warning_issued_by = $2,
          warning_issued_by_name = $3,
          warning_issued_at = NOW(),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      params = [warning_details, null, user_name, exception_id];
    }

    // Action: dismiss
    else if (action === 'dismiss') {
      query = `
        UPDATE attendance_exceptions 
        SET 
          review_status = 'DISMISSED',
          dismissal_reason = $1,
          dismissed_by = $2,
          dismissed_by_name = $3,
          dismissed_at = NOW(),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      params = [dismissal_reason, null, user_name, exception_id];
    }

    else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Exception not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Exception ${action}ed successfully`,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating attendance exception:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Delete attendance exception
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const exceptionId = searchParams.get('id');

    if (!exceptionId) {
      return NextResponse.json(
        { success: false, error: 'Exception ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'DELETE FROM attendance_exceptions WHERE id = $1 RETURNING id',
      [exceptionId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Exception not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Exception deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting attendance exception:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
