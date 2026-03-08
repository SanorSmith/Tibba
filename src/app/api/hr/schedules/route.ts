import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// GET - Fetch employee schedules
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const employeeId = searchParams.get('employee_id');
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    // If id is provided, fetch single schedule
    if (id) {
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return NextResponse.json(
          { success: false, error: 'Invalid schedule ID format' },
          { status: 400 }
        );
      }

      const query = `
        SELECT 
          es.id,
          es.employee_id,
          s.custom_staff_id as employee_number,
          s.firstname as first_name,
          s.lastname as last_name,
          s.unit as department_name,
          es.shift_id,
          sh.name as shift_name,
          sh.code as shift_code,
          sh.start_time as shift_start,
          sh.end_time as shift_end,
          es.effective_date,
          es.end_date,
          es.schedule_type,
          es.rotation_pattern,
          es.is_active,
          es.status,
          es.approved_by_name,
          es.approved_at,
          es.notes,
          es.created_at,
          es.updated_at
        FROM employee_schedules es
        LEFT JOIN staff s ON es.employee_id = s.staffid
        LEFT JOIN shifts sh ON es.shift_id = sh.id
        WHERE es.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Schedule not found' },
          { status: 404 }
        );
      }

      const schedule = result.rows[0];

      // Get daily schedule details
      const dailyDetailsResult = await pool.query(
        'SELECT * FROM daily_schedule_details WHERE schedule_id = $1 ORDER BY day_of_week',
        [id]
      );

      const formattedSchedule = {
        id: schedule.id,
        employee_id: schedule.employee_number || schedule.employee_id.toString(),
        employee_name: `${schedule.first_name} ${schedule.last_name}`,
        department_name: schedule.department_name,
        shift_id: schedule.shift_code,
        shift_name: schedule.shift_name,
        shift_code: schedule.shift_code,
        effective_date: schedule.effective_date,
        end_date: schedule.end_date,
        schedule_type: schedule.schedule_type,
        status: schedule.status,
        daily_details: dailyDetailsResult.rows,
      };

      return NextResponse.json({
        success: true,
        data: formattedSchedule,
      });
    }

    let query = `
      SELECT 
        es.id,
        es.employee_id,
        s.custom_staff_id as employee_number,
        s.firstname as first_name,
        s.lastname as last_name,
        s.unit as department_name,
        es.shift_id,
        sh.name as shift_name,
        sh.code as shift_code,
        sh.start_time as shift_start,
        sh.end_time as shift_end,
        es.effective_date,
        es.end_date,
        es.schedule_type,
        es.rotation_pattern,
        es.is_active,
        es.status,
        es.approved_by_name,
        es.approved_at,
        es.notes,
        es.created_at,
        es.updated_at
      FROM employee_schedules es
      INNER JOIN staff s ON es.employee_id = s.staffid
      LEFT JOIN shifts sh ON es.shift_id = sh.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (employeeId) {
      query += ` AND s.custom_staff_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    }

    if (date) {
      query += ` AND es.effective_date <= $${paramIndex} AND (es.end_date IS NULL OR es.end_date >= $${paramIndex})`;
      params.push(date);
      paramIndex++;
    }

    if (status) {
      query += ` AND es.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ' ORDER BY es.effective_date DESC, s.firstname ASC';

    const result = await pool.query(query, params);

    // Get daily schedule details for each schedule
    const scheduleIds = result.rows.map(r => r.id);
    let dailyDetails: any[] = [];

    if (scheduleIds.length > 0) {
      const detailsQuery = `
        SELECT 
          schedule_id,
          day_of_week,
          start_time,
          end_time,
          lunch_start,
          lunch_end,
          lunch_duration_mins,
          morning_break_start,
          morning_break_end,
          afternoon_break_start,
          afternoon_break_end,
          break_duration_mins,
          total_work_hours,
          net_work_hours,
          flexible_start,
          flexible_end,
          core_hours_start,
          core_hours_end,
          is_active
        FROM daily_schedule_details
        WHERE schedule_id = ANY($1)
        ORDER BY day_of_week
      `;
      const detailsResult = await pool.query(detailsQuery, [scheduleIds]);
      dailyDetails = detailsResult.rows;
    }

    // Format the response
    const formattedSchedules = result.rows.map(row => ({
      id: row.id,
      employee_id: row.employee_number,
      employee_name: `${row.first_name} ${row.last_name}`,
      department_name: row.department_name,
      shift_id: row.shift_code,
      shift_name: row.shift_name,
      shift_start: row.shift_start,
      shift_end: row.shift_end,
      effective_date: row.effective_date,
      end_date: row.end_date,
      schedule_type: row.schedule_type,
      rotation_pattern: row.rotation_pattern,
      is_active: row.is_active,
      status: row.status,
      approved_by_name: row.approved_by_name,
      approved_at: row.approved_at,
      notes: row.notes,
      daily_details: dailyDetails.filter(d => d.schedule_id === row.id).map(d => ({
        day_of_week: d.day_of_week,
        day_name: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.day_of_week],
        start_time: d.start_time,
        end_time: d.end_time,
        lunch_start: d.lunch_start,
        lunch_end: d.lunch_end,
        lunch_duration: d.lunch_duration_mins,
        morning_break_start: d.morning_break_start,
        morning_break_end: d.morning_break_end,
        afternoon_break_start: d.afternoon_break_start,
        afternoon_break_end: d.afternoon_break_end,
        break_duration: d.break_duration_mins,
        total_hours: parseFloat(d.total_work_hours) || 0,
        net_hours: parseFloat(d.net_work_hours) || 0,
        flexible_start: d.flexible_start,
        flexible_end: d.flexible_end,
        core_hours_start: d.core_hours_start,
        core_hours_end: d.core_hours_end,
        is_active: d.is_active,
      })),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedSchedules,
      count: formattedSchedules.length,
    });
  } catch (error: any) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create new employee schedule
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      employee_id,
      shift_id,
      effective_date,
      end_date,
      schedule_type,
      rotation_pattern,
      notes,
      daily_details,
    } = body;

    // Validate required fields
    if (!employee_id || !shift_id || !effective_date) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get staff UUID - handle both custom_staff_id and STAFF- prefixed IDs
    let staffResult;
    let searchId = employee_id;
    
    if (employee_id.startsWith('STAFF-')) {
      // Extract UUID part from STAFF-XXXXXXXX format
      searchId = employee_id.replace('STAFF-', '');
      // Try to find by UUID suffix
      staffResult = await pool.query(
        'SELECT staffid FROM staff WHERE staffid::text LIKE $1 OR custom_staff_id = $2',
        [`%${searchId}`, employee_id]
      );
    } else {
      // Search by custom_staff_id or exact staffid
      staffResult = await pool.query(
        'SELECT staffid FROM staff WHERE custom_staff_id = $1 OR staffid::text = $1',
        [employee_id]
      );
    }

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

    // Create schedule
    const scheduleResult = await pool.query(
      `INSERT INTO employee_schedules (
        employee_id, shift_id, effective_date, end_date, schedule_type,
        rotation_pattern, notes, status, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id`,
      [
        employeeUuid,
        shiftUuid,
        effective_date,
        end_date || null,
        schedule_type || 'REGULAR',
        rotation_pattern || null,
        notes || null,
        'ACTIVE',
        '00000000-0000-0000-0000-000000000001',
      ]
    );

    const scheduleId = scheduleResult.rows[0].id;

    // Create daily schedule details if provided
    if (daily_details && Array.isArray(daily_details)) {
      for (const detail of daily_details) {
        await pool.query(
          `INSERT INTO daily_schedule_details (
            schedule_id, day_of_week, start_time, end_time,
            lunch_start, lunch_end, lunch_duration_mins,
            morning_break_start, morning_break_end,
            afternoon_break_start, afternoon_break_end,
            break_duration_mins, total_work_hours, net_work_hours,
            flexible_start, flexible_end, core_hours_start, core_hours_end,
            organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [
            scheduleId,
            detail.day_of_week,
            detail.start_time,
            detail.end_time,
            detail.lunch_start || null,
            detail.lunch_end || null,
            detail.lunch_duration || 60,
            detail.morning_break_start || null,
            detail.morning_break_end || null,
            detail.afternoon_break_start || null,
            detail.afternoon_break_end || null,
            detail.break_duration || 15,
            detail.total_hours || 8,
            detail.net_hours || 7,
            detail.flexible_start || false,
            detail.flexible_end || false,
            detail.core_hours_start || null,
            detail.core_hours_end || null,
            '00000000-0000-0000-0000-000000000001',
          ]
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: scheduleId },
      message: 'Schedule created successfully',
    });
  } catch (error: any) {
    console.error('Error creating schedule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Update employee schedule
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, end_date, notes, approved_by } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID required' },
        { status: 400 }
      );
    }

    let query = 'UPDATE employee_schedules SET updated_at = NOW()';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      query += `, status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (end_date !== undefined) {
      query += `, end_date = $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    if (notes !== undefined) {
      query += `, notes = $${paramIndex}`;
      params.push(notes);
      paramIndex++;
    }

    if (approved_by) {
      const approverResult = await pool.query(
        'SELECT firstname, lastname FROM staff WHERE custom_staff_id = $1 OR staffid::text = $1',
        [approved_by]
      );

      if (approverResult.rows.length > 0) {
        const approver = approverResult.rows[0];
        query += `, approved_by_name = $${paramIndex}, approved_at = NOW()`;
        params.push(`${approver.firstname} ${approver.lastname}`);
        paramIndex++;
      }
    }

    query += ` WHERE id = $${paramIndex}`;
    params.push(id);

    await pool.query(query, params);

    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Delete employee schedule
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Schedule ID required' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM employee_schedules WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
