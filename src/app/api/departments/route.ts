/**
 * Departments API - CRUD Operations
 * GET /api/departments - List all departments
 * POST /api/departments - Create new department
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Check if database URL is configured
const databaseUrl = process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

// GET /api/departments - List all departments
export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing',
          instructions: [
            '1. Create .env.local file in project root',
            '2. Add: OPENEHR_DATABASE_URL=postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25-pooler.c-3.eu-central-1.aws.neon.tech/neondb',
            '3. Restart the development server'
          ]
        },
        { status: 500 }
      );
    }

    console.log('Fetching departments from Neon database...');
    console.log('Database URL configured:', !!databaseUrl);
    
    const result = await pool!.query(
      `SELECT departmentid as id, name, phone as contact_phone, email as contact_email, 
              address as location, createdat as created_at, updatedat as updated_at
       FROM departments 
       ORDER BY name ASC`
    );

    console.log('Departments fetched:', result.rows.length, 'departments found');

    // Transform the data to match the expected interface
    const transformedData = result.rows.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      name_ar: null,
      code: dept.name.substring(0, 3).toUpperCase(),
      description: null,
      head_of_department: null,
      contact_email: dept.contact_email,
      contact_phone: dept.contact_phone,
      location: dept.location,
      capacity: null,
      is_active: true,
      created_at: dept.created_at,
      updated_at: dept.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Departments fetch error:', error);
    
    // Check if it's a connection error
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('connection') ||
          error.message.includes('authentication')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            details: error.message,
            instructions: [
              '1. Check if OPENEHR_DATABASE_URL is correct in .env.local',
              '2. Verify Neon database is accessible',
              '3. Check network connection',
              '4. Visit /api/test-departments for detailed diagnostics'
            ]
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('does not exist') || 
          error.message.includes('relation "departments" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Departments table not found',
            details: 'The departments table does not exist in the database',
            instructions: [
              '1. Create departments table in Neon database',
              '2. Run the migration script',
              '3. Contact database administrator'
            ]
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch departments',
        details: error instanceof Error ? error.message : 'Unknown error',
        database_configured: !!databaseUrl
      },
      { status: 500 }
    );
  }
}

// POST /api/departments - Create new department
export async function POST(request: NextRequest) {
  try {
    if (!databaseUrl || !pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    const { name, contact_email, contact_phone, location } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    // Insert new department using existing table structure
    const result = await pool.query(
      `INSERT INTO departments 
       (name, email, phone, address, createdat, updatedat)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING departmentid, name, email, phone, address, createdat, updatedat`,
      [
        name,
        contact_email || null,
        contact_phone || null,
        location || null,
      ]
    );

    // Transform the result to match expected interface
    const transformedData = {
      id: result.rows[0].departmentid,
      name: result.rows[0].name,
      name_ar: null,
      code: name.substring(0, 3).toUpperCase(),
      description: null,
      head_of_department: null,
      contact_email: result.rows[0].email,
      contact_phone: result.rows[0].phone,
      location: result.rows[0].address,
      capacity: null,
      is_active: true,
      created_at: result.rows[0].createdat,
      updated_at: result.rows[0].updatedat
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      message: 'Department created successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Department creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create department' },
      { status: 500 }
    );
  }
}

// PUT /api/departments/[id] - Update department
export async function PUT(request: NextRequest, searchParams: { id: string }) {
  try {
    const { id } = searchParams;
    
    if (!databaseUrl || !pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, contact_email, contact_phone, location } = body;

    // Check if department exists
    const existingDept = await pool.query(
      'SELECT departmentid FROM departments WHERE departmentid = $1',
      [id]
    );

    if (existingDept.rows.length === 0) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Update department using existing table structure
    const result = await pool.query(
      `UPDATE departments 
       SET name = $1, email = $2, phone = $3, address = $4, updatedat = NOW()
       WHERE departmentid = $5
       RETURNING departmentid, name, email, phone, address, createdat, updatedat`,
      [
        name,
        contact_email || null,
        contact_phone || null,
        location || null,
        id,
      ]
    );

    // Transform the result to match expected interface
    const transformedData = {
      id: result.rows[0].departmentid,
      name: result.rows[0].name,
      name_ar: null,
      code: name.substring(0, 3).toUpperCase(),
      description: null,
      head_of_department: null,
      contact_email: result.rows[0].email,
      contact_phone: result.rows[0].phone,
      location: result.rows[0].address,
      capacity: null,
      is_active: true,
      created_at: result.rows[0].createdat,
      updated_at: result.rows[0].updatedat
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
      message: 'Department updated successfully',
    });

  } catch (error) {
    console.error('Department update error:', error);
    return NextResponse.json(
      { error: 'Failed to update department' },
      { status: 500 }
    );
  }
}

// DELETE /api/departments/[id] - Delete department
export async function DELETE(request: NextRequest, searchParams: { id: string }) {
  try {
    const { id } = searchParams;
    
    if (!databaseUrl || !pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    if (!id) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    // Check if department exists
    const existingDept = await pool.query(
      'SELECT departmentid FROM departments WHERE departmentid = $1',
      [id]
    );

    if (existingDept.rows.length === 0) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Delete department
    await pool.query('DELETE FROM departments WHERE departmentid = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Department deleted successfully',
    });

  } catch (error) {
    console.error('Department deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete department' },
      { status: 500 }
    );
  }
}
