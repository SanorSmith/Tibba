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

// =====================================================
// POST - Create new employee with compensation
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Debug: Log what we're receiving
    console.log('🔍 API Received Data:', {
      body_keys: Object.keys(body),
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      date_of_hire: body.date_of_hire,
      basic_salary: body.basic_salary,
      payment_frequency: body.payment_frequency
    });
    
    const {
      // Employee details
      first_name,
      middle_name,
      last_name,
      date_of_birth,
      gender,
      marital_status,
      nationality,
      national_id,
      email,
      phone,
      address,
      employment_type,
      employee_category,
      job_title,
      department_id,
      date_of_hire,
      // Compensation details
      basic_salary,
      payment_frequency = 'MONTHLY',
      housing_allowance,
      transport_allowance,
      meal_allowance,
      currency = 'USD'
    } = body;

    // Validate required fields
    if (!first_name || !last_name || !email || !date_of_hire) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. Create employee record
      const employeeQuery = `
        INSERT INTO staff (
          workspaceid,
          firstname, 
          middlename, 
          lastname, 
          email,
          role,
          unit,
          createdat,
          updatedat
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING staffid, custom_staff_id
      `;
      
      const employeeResult = await client.query(employeeQuery, [
        'b227528d-ca34-4850-9b72-94a220365d7f', // Baghdad health center workspace ID
        first_name,
        middle_name || null,
        last_name,
        email,
        job_title || 'Staff',
        department_id || 'General'
      ]);

      const newEmployee = employeeResult.rows[0];
      const employeeId = newEmployee.staffid;

      // 2. Create compensation record
      if (basic_salary) {
        const compensationQuery = `
          INSERT INTO employee_compensation (
            employee_id,
            basic_salary,
            housing_allowance,
            transport_allowance,
            meal_allowance,
            payment_frequency,
            currency,
            effective_from,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
          RETURNING *
        `;
        
        await client.query(compensationQuery, [
          employeeId,
          basic_salary,
          housing_allowance,
          transport_allowance,
          meal_allowance,
          payment_frequency,
          currency,
          date_of_hire
        ]);
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          employee_id: employeeId,
          custom_staff_id: newEmployee.custom_staff_id,
          message: 'Employee and compensation created successfully'
        }
      }, { status: 201 });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
