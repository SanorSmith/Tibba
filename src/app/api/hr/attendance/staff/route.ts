import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';


// =====================================================
// GET - Fetch staff attendance records
// =====================================================
export async function GET(request: NextRequest) {
  try {
    // Attendance and the staff list behind it are facility-private.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const today = searchParams.get('today');

    if (today === 'true') {
      // Get today's attendance status for all staff
      const result = await pool.query(`
        SELECT 
          s.staffid as employee_id,
          s.firstname || ' ' || s.lastname as employee_name,
          s.custom_staff_id as employee_number,
          s.role,
          s.unit,
          da.date,
          da.first_in,
          da.last_out,
          da.total_hours,
          da.status,
          CASE 
            WHEN da.first_in IS NULL THEN 'NOT_CHECKED_IN'
            WHEN da.last_out IS NULL THEN 'CHECKED_IN'
            ELSE 'CHECKED_OUT'
          END as current_status
        FROM staff s
        LEFT JOIN daily_attendance da ON s.staffid = da.employee_id 
          AND da.date = CURRENT_DATE
        WHERE s.workspaceid = $1
        ORDER BY s.firstname, s.lastname
      `, [workspaceId]);

      return NextResponse.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    }

    if (staffId) {
      // Get attendance records for specific staff member
      let query = `
        SELECT 
          da.id,
          da.employee_id,
          da.employee_name,
          da.employee_number,
          da.date,
          da.first_in,
          da.last_out,
          da.total_hours,
          da.regular_hours,
          da.overtime_hours,
          da.status,
          da.shift_name,
          da.scheduled_start,
          da.scheduled_end
        FROM daily_attendance da
        WHERE da.employee_id = $1 AND da.workspaceid = $2
      `;

      const params: any[] = [staffId, workspaceId];
      let paramIndex = 3;

      if (startDate) {
        query += ` AND da.date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND da.date <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += ' ORDER BY da.date DESC LIMIT 100';

      const result = await pool.query(query, params);

      return NextResponse.json({
        success: true,
        data: result.rows,
        count: result.rows.length,
      });
    }

    // Get all attendance records with filters
    let query = `
      SELECT 
        da.id,
        da.employee_id,
        da.employee_name,
        da.employee_number,
        da.date,
        da.first_in,
        da.last_out,
        da.total_hours,
        da.status
      FROM daily_attendance da
      WHERE da.workspaceid = $1
    `;

    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND da.date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND da.date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ' ORDER BY da.date DESC, da.employee_name ASC LIMIT 500';

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
    });
  } catch (error: any) {
    console.error('Error fetching staff attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Record check-in or check-out
// =====================================================
export async function POST(request: NextRequest) {
  try {
    // Punches may only be filed against this facility's own staff.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const body = await request.json();
    const {
      staff_id,
      transaction_type, // 'IN' or 'OUT'
      timestamp,
      device_type = 'MANUAL',
      location,
      source = 'API',
    } = body;

    // Validate required fields
    if (!staff_id || !transaction_type) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: staff_id and transaction_type' },
        { status: 400 }
      );
    }

    if (!['IN', 'OUT'].includes(transaction_type)) {
      return NextResponse.json(
        { success: false, error: 'transaction_type must be IN or OUT' },
        { status: 400 }
      );
    }

    // Get employee details from staff table
    const empResult = await pool.query(`
      SELECT staffid, firstname, lastname, custom_staff_id 
      FROM staff 
      WHERE staffid = $1 AND workspaceid = $2
    `, [staff_id, workspaceId]);

    if (empResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      );
    }

    const employee = empResult.rows[0];
    const employeeUuid = employee.staffid;
    const employeeName = `${employee.firstname} ${employee.lastname}`;
    const date = new Date().toISOString().split('T')[0];

    // Insert transaction
    const transactionResult = await pool.query(`
      INSERT INTO attendance_transactions (
        employee_id,
        employee_name,
        employee_number,
        transaction_type,
        timestamp,
        device_type,
        source,
        is_valid,
        validation_status,
        workspaceid
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, 'VALID', $8
      ) RETURNING id
    `, [
      employeeUuid,
      employeeName,
      employee.custom_staff_id || 'N/A',
      transaction_type,
      timestamp || new Date().toISOString(),
      device_type,
      source,
      workspaceId
    ]);

    const transactionId = transactionResult.rows[0].id;

    // Update or create daily summary
    let dailySummaryId;
    if (transaction_type === 'IN') {
      // Check if daily summary exists
      const existingResult = await pool.query(`
        SELECT id, first_in FROM daily_attendance 
        WHERE employee_id = $1 AND date = $2 AND workspaceid = $3
      `, [employeeUuid, date, workspaceId]);

      if (existingResult.rows.length > 0) {
        dailySummaryId = existingResult.rows[0].id;
        if (!existingResult.rows[0].first_in) {
          await pool.query(`
            UPDATE daily_attendance 
            SET first_in = $1, status = 'PRESENT' 
            WHERE id = $2
          `, [timestamp || new Date().toISOString(), dailySummaryId]);
        }
      } else {
        const newResult = await pool.query(`
          INSERT INTO daily_attendance (
            employee_id,
            employee_name,
            employee_number,
            date,
            first_in,
            status,
            workspaceid
          ) VALUES ($1, $2, $3, $4, $5, 'PRESENT', $6)
          RETURNING id
        `, [employeeUuid, employeeName, employee.custom_staff_id || 'N/A', date, timestamp || new Date().toISOString(), workspaceId]);
        dailySummaryId = newResult.rows[0].id;
      }
    } else {
      // Check-out - update last_out and calculate hours INCLUDING overtime split.
      // Standard day = 8 hours. Anything beyond 8 is overtime.
      const updateResult = await pool.query(`
        UPDATE daily_attendance
        SET last_out = $1,
            total_hours = CASE
              WHEN first_in IS NOT NULL THEN
                EXTRACT(EPOCH FROM ($1 - first_in)) / 3600
              ELSE total_hours
            END,
            regular_hours = CASE
              WHEN first_in IS NOT NULL THEN
                LEAST(EXTRACT(EPOCH FROM ($1 - first_in)) / 3600, 8)
              ELSE regular_hours
            END,
            overtime_hours = CASE
              WHEN first_in IS NOT NULL THEN
                GREATEST(EXTRACT(EPOCH FROM ($1 - first_in)) / 3600 - 8, 0)
              ELSE overtime_hours
            END
        WHERE employee_id = $2 AND date = $3 AND workspaceid = $4
        RETURNING id
      `, [timestamp || new Date().toISOString(), employeeUuid, date, workspaceId]);
      
      dailySummaryId = updateResult.rows[0].id;
      
      if (!dailySummaryId) {
        // Create summary with only check-out (unusual case)
        const newResult = await pool.query(`
          INSERT INTO daily_attendance (
            employee_id,
            employee_name,
            employee_number,
            date,
            last_out,
            status,
            workspaceid
          ) VALUES ($1, $2, $3, $4, $5, 'PRESENT', $6)
          RETURNING id
        `, [employeeUuid, employeeName, employee.custom_staff_id || 'N/A', date, timestamp || new Date().toISOString(), workspaceId]);
        dailySummaryId = newResult.rows[0].id;
      }
    }

    // Mark transaction as processed
    await pool.query(`
      UPDATE attendance_transactions 
      SET processed = true, processed_at = NOW(), daily_summary_id = $1
      WHERE id = $2
    `, [dailySummaryId, transactionId]);

    // Get the updated attendance record
    const attendanceResult = await pool.query(`
      SELECT 
        da.id,
        da.employee_id,
        da.employee_name,
        da.employee_number,
        da.date,
        da.first_in,
        da.last_out,
        da.total_hours,
        da.status,
        CASE 
          WHEN da.first_in IS NULL THEN 'NOT_CHECKED_IN'
          WHEN da.last_out IS NULL THEN 'CHECKED_IN'
          ELSE 'CHECKED_OUT'
        END as current_status
      FROM daily_attendance da
      WHERE da.id = $1
    `, [dailySummaryId]);

    return NextResponse.json({
      success: true,
      message: 'Transaction processed successfully',
      data: {
        transaction_id: transactionId,
        daily_summary: attendanceResult.rows[0],
      },
    });
    });
  } catch (error: any) {
    console.error('Error recording attendance:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// GET - Fetch attendance transactions
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staff_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = `
      SELECT 
        at.id,
        at.employee_id,
        at.employee_name,
        at.employee_number,
        at.transaction_type,
        at.timestamp,
        at.device_type,
        at.location,
        at.is_valid,
        at.validation_status,
        at.source,
        s.role,
        s.unit
      FROM attendance_transactions at
      JOIN staff s ON at.employee_id = s.staffid
      WHERE at.workspaceid = $1
    `;

    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (staffId) {
      query += ` AND at.employee_id = $${paramIndex}`;
      params.push(staffId);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND at.timestamp >= $${paramIndex}::TIMESTAMP`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND at.timestamp <= $${paramIndex}::TIMESTAMP`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY at.timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
    });
  } catch (error: any) {
    console.error('Error fetching attendance transactions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
