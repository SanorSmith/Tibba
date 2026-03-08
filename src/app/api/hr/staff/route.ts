import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// GET - Fetch staff members
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const unit = searchParams.get('unit');
    const staffId = searchParams.get('staff_id');

    let query = `
      SELECT 
        staffid,
        workspaceid,
        role,
        firstname,
        middlename,
        lastname,
        unit,
        specialty,
        phone,
        email,
        createdat,
        updatedat,
        dateofbirth,
        custom_staff_id
      FROM staff
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (unit) {
      query += ` AND unit = $${paramIndex}`;
      params.push(unit);
      paramIndex++;
    }

    if (staffId) {
      query += ` AND custom_staff_id = $${paramIndex}`;
      params.push(staffId);
      paramIndex++;
    }

    query += ' ORDER BY firstname ASC, lastname ASC';

    const result = await pool.query(query, params);

    // Format the response
    const formattedStaff = result.rows.map((row, index) => ({
      id: row.custom_staff_id || `STAFF-${row.staffid.toString().slice(-8)}`, // Ensure unique ID
      staff_id: row.custom_staff_id || `STAFF-${row.staffid.toString().slice(-8)}`, // Ensure unique staff_id
      staffid: row.staffid,
      workspaceid: row.workspaceid,
      role: row.role,
      first_name: row.firstname,
      middle_name: row.middlename,
      last_name: row.lastname,
      full_name: `${row.firstname} ${row.middlename || ''} ${row.lastname}`.replace(/\s+/g, ' ').trim(),
      unit: row.unit,
      department_name: row.unit, // Map unit to department_name for compatibility
      specialty: row.specialty,
      phone: row.phone,
      email: row.email,
      date_of_birth: row.dateofbirth,
      created_at: row.createdat,
      updated_at: row.updatedat,
    }));

    return NextResponse.json({
      success: true,
      data: formattedStaff,
      count: formattedStaff.length,
    });
  } catch (error: any) {
    console.error('Error fetching staff:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// POST - Create new staff member
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workspaceid,
      role,
      firstname,
      middlename,
      lastname,
      unit,
      specialty,
      phone,
      email,
      dateofbirth,
      custom_staff_id,
    } = body;

    // Validate required fields
    if (!workspaceid || !role || !firstname || !lastname) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `INSERT INTO staff (
        workspaceid, role, firstname, middlename, lastname,
        unit, specialty, phone, email, dateofbirth, custom_staff_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING staffid`,
      [
        workspaceid,
        role,
        firstname,
        middlename || null,
        lastname,
        unit || null,
        specialty || null,
        phone || null,
        email || null,
        dateofbirth || null,
        custom_staff_id || null,
      ]
    );

    return NextResponse.json({
      success: true,
      data: { staffid: result.rows[0].staffid },
      message: 'Staff member created successfully',
    });
  } catch (error: any) {
    console.error('Error creating staff:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Update staff member
// =====================================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffid, ...updates } = body;

    if (!staffid) {
      return NextResponse.json(
        { success: false, error: 'Staff ID required' },
        { status: 400 }
      );
    }

    const allowedFields = [
      'role', 'firstname', 'middlename', 'lastname',
      'unit', 'specialty', 'phone', 'email', 'dateofbirth', 'custom_staff_id'
    ];

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        params.push(updates[key]);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateFields.push(`updatedat = NOW()`);
    params.push(staffid);

    const query = `UPDATE staff SET ${updateFields.join(', ')} WHERE staffid = $${paramIndex}`;
    await pool.query(query, params);

    return NextResponse.json({
      success: true,
      message: 'Staff member updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating staff:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Delete staff member
// =====================================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const staffid = searchParams.get('staffid');

    if (!staffid) {
      return NextResponse.json(
        { success: false, error: 'Staff ID required' },
        { status: 400 }
      );
    }

    await pool.query('DELETE FROM staff WHERE staffid = $1', [staffid]);

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting staff:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
