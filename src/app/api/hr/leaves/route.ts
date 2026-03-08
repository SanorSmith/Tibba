import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// GET - Fetch leave requests
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employee_id');
    const leaveTypeId = searchParams.get('leave_type_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = `
      SELECT 
        lr.id,
        lr.employee_id,
        lr.employee_name,
        lr.employee_number,
        lr.leave_type_id,
        lr.leave_type_code,
        lt.name as leave_type_name,
        lt.color as leave_type_color,
        lr.start_date,
        lr.end_date,
        lr.return_date,
        lr.days_count,
        lr.working_days_count,
        lr.reason,
        lr.emergency_contact,
        lr.emergency_reason,
        lr.status,
        lr.approved_by,
        lr.approved_by_name,
        lr.approved_at,
        lr.rejection_reason,
        lr.replacement_employee,
        lr.replacement_name,
        lr.handover_notes,
        lr.created_at,
        lr.updated_at
      FROM leave_requests lr
      LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND lr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (employeeId) {
      query += ` AND lr.employee_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    }

    if (leaveTypeId) {
      query += ` AND lr.leave_type_id = $${paramIndex}`;
      params.push(leaveTypeId);
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

    query += ' ORDER BY lr.created_at DESC';

    const result = await pool.query(query, params);

    // Format the response
    const formattedRequests = result.rows.map(row => ({
      id: row.id,
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      employee_number: row.employee_number,
      leave_type_id: row.leave_type_id,
      leave_type: row.leave_type_code,
      leave_type_name: row.leave_type_name,
      leave_type_color: row.leave_type_color,
      start_date: row.start_date,
      end_date: row.end_date,
      return_date: row.return_date,
      days_count: row.days_count,
      working_days: row.working_days_count,
      reason: row.reason,
      emergency_contact: row.emergency_contact,
      emergency_reason: row.emergency_reason,
      status: row.status,
      approved_by: row.approved_by,
      approved_by_name: row.approved_by_name,
      approved_at: row.approved_at,
      rejection_reason: row.rejection_reason,
      replacement_employee: row.replacement_employee,
      replacement_name: row.replacement_name,
      handover_notes: row.handover_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedRequests,
      count: formattedRequests.length,
    });
  } catch (error: any) {
    console.error('Error fetching leave requests:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create new leave request
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      days_count,
      reason,
      emergency_contact,
      replacement_employee,
      handover_notes,
    } = body;

    // Validate required fields
    if (!employee_id || !leave_type_id || !start_date || !end_date || !days_count) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get employee details from staff table
    const empResult = await pool.query(
      'SELECT staffid as id, custom_staff_id as employee_id, firstname as first_name, lastname as last_name, custom_staff_id as employee_number FROM staff WHERE staffid = $1',
      [employee_id]
    );

    if (empResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const employee = empResult.rows[0];
    const employeeUuid = employee.id;
    const employeeName = `${employee.first_name} ${employee.last_name}`;

    // Get leave type details
    const leaveTypeResult = await pool.query(
      'SELECT id, code FROM leave_types WHERE id = $1',
      [leave_type_id]
    );

    if (leaveTypeResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Leave type not found' },
        { status: 404 }
      );
    }

    const leaveTypeCode = leaveTypeResult.rows[0].code;

    // Calculate return date (day after end_date)
    const returnDate = new Date(end_date);
    returnDate.setDate(returnDate.getDate() + 1);

    const result = await pool.query(
      `INSERT INTO leave_requests (
        employee_id, employee_name, employee_number, leave_type_id, leave_type_code,
        start_date, end_date, return_date, days_count, working_days_count,
        reason, emergency_contact, replacement_employee, handover_notes,
        status, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        employeeUuid,
        employeeName,
        employee.employee_number,
        leave_type_id,
        leaveTypeCode,
        start_date,
        end_date,
        returnDate.toISOString().split('T')[0],
        days_count,
        days_count, // working_days_count same as days_count for now
        reason || null,
        emergency_contact || null,
        replacement_employee || null,
        handover_notes || null,
        'PENDING',
        '00000000-0000-0000-0000-000000000001',
      ]
    );

    // Update leave balance - increase pending
    const currentYear = new Date().getFullYear();
    await pool.query(
      `UPDATE leave_balance 
       SET accrued = accrued + $1,
           updated_at = NOW()
       WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
      [days_count, employeeUuid, leave_type_id, currentYear]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id },
      message: 'Leave request created successfully',
    });
  } catch (error: any) {
    console.error('Error creating leave request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Update leave request (approve/reject)
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approved_by, rejection_reason } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let query = 'UPDATE leave_requests SET status = $1, updated_at = NOW()';
    const params: any[] = [status];
    let paramIndex = 2;

    if (status === 'APPROVED' && approved_by) {
      // Get approver details
      const approverResult = await pool.query(
        'SELECT first_name, last_name FROM employees WHERE employee_id = $1',
        [approved_by]
      );

      if (approverResult.rows.length > 0) {
        const approver = approverResult.rows[0];
        query += `, approved_by_name = $${paramIndex}, approved_at = NOW()`;
        params.push(`${approver.first_name} ${approver.last_name}`);
        paramIndex++;
      }
    }

    if (status === 'REJECTED' && rejection_reason) {
      query += `, rejection_reason = $${paramIndex}`;
      params.push(rejection_reason);
      paramIndex++;
    }

    query += ` WHERE id = $${paramIndex} RETURNING employee_id, leave_type_id, days_count`;
    params.push(id);

    const updateResult = await pool.query(query, params);
    
    if (updateResult.rows.length > 0) {
      const leaveRequest = updateResult.rows[0];
      const currentYear = new Date().getFullYear();
      
      if (status === 'APPROVED') {
        // Decrease accrued, increase used
        await pool.query(
          `UPDATE leave_balance 
           SET accrued = GREATEST(0, accrued - $1),
               used = COALESCE(used, 0) + $1,
               updated_at = NOW()
           WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
          [leaveRequest.days_count, leaveRequest.employee_id, leaveRequest.leave_type_id, currentYear]
        );
      } else if (status === 'REJECTED') {
        // Decrease accrued (restore available)
        await pool.query(
          `UPDATE leave_balance 
           SET accrued = GREATEST(0, accrued - $1),
               updated_at = NOW()
           WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
          [leaveRequest.days_count, leaveRequest.employee_id, leaveRequest.leave_type_id, currentYear]
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully`,
    });
  } catch (error: any) {
    console.error('Error updating leave request:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
