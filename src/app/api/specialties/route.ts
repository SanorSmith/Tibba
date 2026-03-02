/**
 * Specialties API - CRUD Operations
 * GET /api/specialties - List all specialties
 * POST /api/specialties - Create new specialty
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

// GET /api/specialties - List all specialties
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

    console.log('Fetching specialties from Neon database...');
    console.log('Database URL configured:', !!databaseUrl);
    
    const result = await pool!.query(
      `SELECT specialtyid as id, name, description, departmentid as department_id, 
              code, is_active, createdat as created_at, updatedat as updated_at
       FROM specialties 
       ORDER BY name ASC`
    );

    console.log('Specialties fetched:', result.rows.length, 'specialties found');

    // Transform the data to match the expected interface
    const transformedData = result.rows.map((specialty: any) => ({
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      department_id: specialty.department_id,
      code: specialty.code,
      is_active: specialty.is_active,
      created_at: specialty.created_at,
      updated_at: specialty.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedData,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Specialties fetch error:', error);
    
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
              '4. Visit /api/test-specialties for detailed diagnostics'
            ]
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('does not exist') || 
          error.message.includes('relation') ||
          error.message.includes('specialties')) {
        return NextResponse.json(
          { 
            error: 'Specialties table not found',
            details: 'The specialties table does not exist in the database',
            instructions: [
              '1. Create the specialties table in your Neon database',
              '2. Visit /api/setup-specialties to create the table automatically',
              '3. Or run the SQL setup script manually'
            ]
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch specialties',
        details: error instanceof Error ? error.message : 'Unknown error',
        instructions: [
          '1. Check database connection',
          '2. Verify specialties table exists',
          '3. Check database permissions',
          '4. Visit /api/test-specialties for detailed diagnostics'
        ]
      },
      { status: 500 }
    );
  }
}

// POST /api/specialties - Create new specialty
export async function POST(request: NextRequest) {
  try {
    // Check if database is configured
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const body = await request.json();
    console.log('Creating specialty:', body);

    // Validate required fields
    const { name, description, department_id, code } = body;
    
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Specialty name is required' },
        { status: 400 }
      );
    }

    if (!department_id || !department_id.trim()) {
      return NextResponse.json(
        { error: 'Department ID is required' },
        { status: 400 }
      );
    }

    // Generate specialty code if not provided
    const specialtyCode = code || name.substring(0, 3).toUpperCase();

    // Check if specialty name already exists
    const existingSpecialty = await pool!.query(
      'SELECT specialtyid FROM specialties WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existingSpecialty.rows.length > 0) {
      return NextResponse.json(
        { error: 'A specialty with this name already exists' },
        { status: 409 }
      );
    }

    // Generate UUID for specialty
    const specialtyId = crypto.randomUUID();

    // Insert new specialty
    const result = await pool!.query(
      `INSERT INTO specialties 
       (specialtyid, name, description, departmentid, code, is_active, createdat, updatedat)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING specialtyid, name, description, departmentid, code, is_active, createdat, updatedat`,
      [
        specialtyId,
        name.trim(),
        description || null,
        department_id.trim(),
        specialtyCode,
        true
      ]
    );

    console.log('Specialty created successfully:', result.rows[0]);

    // Transform the response data
    const transformedData = {
      id: result.rows[0].specialtyid,
      name: result.rows[0].name,
      description: result.rows[0].description,
      department_id: result.rows[0].departmentid,
      code: result.rows[0].code,
      is_active: result.rows[0].is_active,
      created_at: result.rows[0].createdat,
      updated_at: result.rows[0].updatedat
    };

    return NextResponse.json({
      success: true,
      message: 'Specialty created successfully',
      data: transformedData
    }, { status: 201 });

  } catch (error) {
    console.error('Specialty creation error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('specialties') || 
          error.message.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Specialties table not found',
            details: 'The specialties table does not exist in the database',
            instructions: [
              '1. Create the specialties table in your Neon database',
              '2. Visit /api/setup-specialties to create the table automatically'
            ]
          },
          { status: 404 }
        );
      }

      if (error.message.includes('duplicate key') ||
          error.message.includes('unique')) {
        return NextResponse.json(
          { error: 'A specialty with this name already exists' },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to create specialty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
