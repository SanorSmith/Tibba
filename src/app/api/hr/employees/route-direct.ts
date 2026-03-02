/**
 * Employees API - Direct PostgreSQL Version
 * GET /api/hr/employees - List employees with pagination and filtering
 * POST /api/hr/employees - Create new employee
 */

import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';

const databaseUrl = process.env.TIBBNA_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database URL is not configured');
}

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// GET /api/hr/employees - List employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const department_id = searchParams.get('department_id');
    const employment_status = searchParams.get('employment_status');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    let whereConditions = [];
    let params: any[] = [];

    if (department_id) {
      whereConditions.push('e.department_id = $' + (whereConditions.length + 1));
      params.push(department_id);
    }

    if (employment_status) {
      whereConditions.push('e.employment_status = $' + (whereConditions.length + 1));
      params.push(employment_status);
    }

    if (search) {
      whereConditions.push('(e.first_name ILIKE $' + (whereConditions.length + 1) + ' OR e.last_name ILIKE $' + (whereConditions.length + 1) + ' OR e.email ILIKE $' + (whereConditions.length + 1) + ')');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const [countResult] = await sql.unsafe(`
      SELECT COUNT(*) as total
      FROM employees e
      ${whereClause}
    `, params);

    // Get employees with department info
    const employees = await sql.unsafe(`
      SELECT 
        e.*,
        d.name as department_name,
        d.code as department_code
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    // Get pagination info
    const total = parseInt(countResult.total);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error: any) {
    console.error('Employees GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees', details: error.message },
      { status: 500 }
    );
  }
}

// POST /api/hr/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['first_name', 'last_name', 'email', 'employee_number'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check if employee number already exists
    const [existingEmployee] = await sql`
      SELECT id FROM employees WHERE employee_number = ${body.employee_number}
    `;

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Employee number already exists' },
        { status: 409 }
      );
    }

    // Check if email already exists
    const [existingEmail] = await sql`
      SELECT id FROM employees WHERE email = ${body.email}
    `;

    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Insert new employee
    const [newEmployee] = await sql`
      INSERT INTO employees (
        employee_number,
        first_name,
        last_name,
        email,
        phone,
        job_title,
        department_id,
        employment_type,
        employment_status,
        hire_date,
        base_salary,
        salary_grade,
        currency,
        metadata
      ) VALUES (
        ${body.employee_number},
        ${body.first_name},
        ${body.last_name},
        ${body.email},
        ${body.phone || null},
        ${body.job_title || null},
        ${body.department_id || null},
        ${body.employment_type || 'FULL_TIME'},
        ${body.employment_status || 'ACTIVE'},
        ${body.hire_date || new Date().toISOString().split('T')[0]},
        ${body.base_salary || 0},
        ${body.salary_grade || null},
        ${body.currency || 'IQD'},
        ${JSON.stringify(body.metadata || {})}
      )
      RETURNING *
    `;

    return NextResponse.json({
      data: newEmployee,
      message: 'Employee created successfully',
    }, { status: 201 });

  } catch (error: any) {
    console.error('Employees POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create employee', details: error.message },
      { status: 500 }
    );
  }
}
