import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEPARTMENTS API START ===');
    
    // Import pg dynamically
    const { Pool } = await import('pg');
    console.log('PG imported successfully');
    
    const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;
    console.log('Database URL exists:', !!databaseUrl);
    
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Creating pool...');
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    console.log('Fetching departments from database...');

    const result = await pool.query(`
      SELECT 
        departmentid as id,
        name,
        description,
        createdat as created_at,
        updatedat as updated_at
      FROM departments
      ORDER BY name ASC
    `);

    console.log('Departments fetched:', result.rows.length, 'departments found');

    // Transform the data to match expected interface
    const transformedData = result.rows.map((dept: any) => ({
      id: dept.id,
      name: dept.name,
      description: dept.description || null,
      code: dept.name.substring(0, 3).toUpperCase(),
      head_of_department: null,
      contact_email: null,
      contact_phone: null,
      location: null,
      capacity: null,
      is_active: true,
      created_at: dept.created_at,
      updated_at: dept.updated_at
    }));

    await pool.end();
    console.log('Pool closed');

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching departments:', error);
    
    // Check for connection errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('connection') ||
          error.message.includes('authentication')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            details: error.message,
            instructions: [
              '1. Check if OPENEHR_DATABASE_URL in .env.local is correct',
              '2. Verify Neon database exists',
              '3. Check network connection',
              '4. Visit /api/setup-departments for diagnostics'
            ]
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('does not exist') || 
          error.message.includes('relation "departments" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Departments table does not exist',
            details: error.message,
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
        database_configured: !!process.env.OPENEHR_DATABASE_URL
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEPARTMENTS POST API START ===');
    
    // Import pg dynamically
    const { Pool } = await import('pg');
    
    const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      await pool.end();
      return NextResponse.json(
        { error: 'Department name is required' },
        { status: 400 }
      );
    }

    // Generate UUID for department
    const departmentId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

    const result = await pool.query(`
      INSERT INTO departments 
       (departmentid, name, description, createdat, updatedat)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING departmentid, name, description, createdat, updatedat
    `, [
      departmentId,
      name,
      description || null
    ]);

    // Transform the result to match expected interface
    const transformedData = {
      id: result.rows[0].departmentid,
      name: result.rows[0].name,
      description: result.rows[0].description,
      code: name.substring(0, 3).toUpperCase(),
      head_of_department: null,
      contact_email: null,
      contact_phone: null,
      location: null,
      capacity: null,
      is_active: true,
      created_at: result.rows[0].createdat,
      updated_at: result.rows[0].updatedat
    };

    await pool.end();

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
