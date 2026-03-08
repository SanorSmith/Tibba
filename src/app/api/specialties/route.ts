import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL || process.env.OPENEHR_DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

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
    const departmentId = searchParams.get('departmentId');
    const active = searchParams.get('active');

    console.log('Fetching specialties from database...');
    console.log('Department filter:', departmentId);
    console.log('Active filter:', active);

    let query = `
      SELECT 
        specialtyid as id,
        name,
        description,
        departmentid as department_id,
        code,
        is_active,
        createdat as created_at,
        updatedat as updated_at
      FROM specialties
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (departmentId) {
      query += ` AND departmentid = $${paramIndex}`;
      params.push(departmentId);
      paramIndex++;
    }

    if (active !== null) {
      query += ` AND is_active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }

    query += ` ORDER BY name`;

    const result = await pool.query(query, params);

    console.log('Specialties query executed successfully');
    console.log('Found', result.rows.length, 'specialties');

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching specialties:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch specialties',
        details: error instanceof Error ? error.message : 'Unknown error'
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

    console.log('Creating new specialty:', body);

    const {
      name,
      description,
      department_id,
      code,
      is_active
    } = body;

    if (!name || !code) {
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['name', 'code']
        },
        { status: 400 }
      );
    }

    const specialtyId = generateUUID();

    const newSpecialty = await pool.query(`
      INSERT INTO specialties (
        specialtyid,
        name,
        description,
        departmentid,
        code,
        is_active,
        createdat,
        updatedat
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW()
      )
      RETURNING *
    `, [
      specialtyId,
      name,
      description || null,
      department_id || null,
      code,
      is_active !== undefined ? is_active : true
    ]);

    console.log('Specialty created successfully:', newSpecialty.rows[0]);

    return NextResponse.json({
      success: true,
      message: 'Specialty created successfully',
      data: newSpecialty.rows[0]
    });

  } catch (error) {
    console.error('Error creating specialty:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create specialty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
