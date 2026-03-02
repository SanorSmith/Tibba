/**
 * Departments API
 * GET /api/departments - Get all departments
 * POST /api/departments - Create new department
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Use the same database as departments
const databaseUrl = process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('OPENEHR_DATABASE_URL is not configured in environment variables');
}

// Neon database connection
const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
}) : null;

// Generate UUID function
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function GET(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || '';
    const isActive = searchParams.get('is_active');

    console.log('Fetching departments from database...');
    console.log('Search term:', searchTerm);
    console.log('Active filter:', isActive);

    let query = `
      SELECT 
        departmentid as id,
        name,
        name_ar,
        code,
        description,
        is_active,
        createdat,
        updatedat
      FROM departments
    `;
    
    const params: any[] = [];
    const conditions: string[] = [];

    if (searchTerm) {
      conditions.push(`(name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 1})`);
      params.push(`%${searchTerm}%`);
    }

    if (isActive !== null && isActive !== undefined) {
      conditions.push(`is_active = $${params.length + 1}`);
      params.push(isActive === 'true');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY name ASC';

    console.log('Final query:', query);
    console.log('Params:', params);

    const result = await pool.query(query, params);

    console.log('Departments query result:', result.rows.length, 'rows found');

    // Transform the data to match the expected format
    const transformedData = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      name_ar: row.name_ar,
      code: row.code,
      description: row.description,
      is_active: row.is_active,
      created_at: row.createdat,
      updated_at: row.updatedat
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching departments:', error);
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

export async function POST(request: NextRequest) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { name, name_ar, code, description, is_active } = body;

    console.log('Creating department:', { name, code, is_active });

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['name', 'code']
        },
        { status: 400 }
      );
    }

    // Generate UUID for the new department
    const departmentId = generateUUID();

    // Insert new department
    const result = await pool.query(`
      INSERT INTO departments (
        departmentid,
        name,
        name_ar,
        code,
        description,
        is_active,
        createdat,
        updatedat
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW()
      )
      RETURNING *
    `, [
      departmentId,
      name,
      name_ar || null,
      code,
      description || null,
      is_active !== undefined ? is_active : true
    ]);

    console.log('Department created successfully:', result.rows[0]);

    // Transform the response to match the expected format
    const transformedData = {
      id: result.rows[0].departmentid,
      name: result.rows[0].name,
      name_ar: result.rows[0].name_ar,
      code: result.rows[0].code,
      description: result.rows[0].description,
      is_active: result.rows[0].is_active,
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
      { 
        error: 'Failed to create department',
        details: error instanceof Error ? error.message : 'Unknown error',
        database_configured: !!databaseUrl
      },
      { status: 500 }
    );
  }
}
