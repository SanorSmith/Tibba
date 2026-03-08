import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// =====================================================
// GET - Fetch employees
// =====================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const departmentId = searchParams.get('department_id');
    const employeeId = searchParams.get('employee_id');

    let query = `
      SELECT 
        staffid as id,
        custom_staff_id as employee_id,
        custom_staff_id as employee_number,
        firstname as first_name,
        middlename as middle_name,
        lastname as last_name,
        dateofbirth as date_of_birth,
        phone,
        email,
        role as job_title,
        unit as department_name,
        specialty,
        workspaceid,
        createdat as created_at,
        updatedat as updated_at
      FROM staff
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (departmentId) {
      query += ` AND unit = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    if (employeeId) {
      query += ` AND custom_staff_id = $${paramIndex}`;
      params.push(employeeId);
      paramIndex++;
    }

    query += ' ORDER BY firstname ASC, lastname ASC';
    
    // First, get total count
    const countQuery = `SELECT COUNT(*) FROM staff WHERE 1=1`;
    const countResult = await pool.query(countQuery);
    console.log(`Total staff in database: ${countResult.rows[0].count}`);

    const result = await pool.query(query, params);
    
    // Log total count
    console.log(`Total employees fetched: ${result.rows.length}`);

    // Format the response
    const formattedEmployees = result.rows.map(row => ({
      id: row.id, // staffid UUID
      employee_id: row.employee_id || `STAFF-${row.id.substring(0, 8)}`, // custom_staff_id or generated
      employee_number: row.employee_number || `STAFF-${row.id.substring(0, 8)}`,
      first_name: row.first_name,
      middle_name: row.middle_name,
      last_name: row.last_name,
      date_of_birth: row.date_of_birth,
      phone: row.phone,
      email: row.email,
      job_title: row.job_title, // role
      department_name: row.department_name, // unit
      specialty: row.specialty,
      workspaceid: row.workspaceid,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: formattedEmployees,
      count: formattedEmployees.length,
    });
  } catch (error: any) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
