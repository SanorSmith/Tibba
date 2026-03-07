import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('=== GET SINGLE SPECIALTY ===');
    
    const { Pool } = await import('pg');
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    const { id } = await context.params;
    console.log('Fetching specialty with ID:', id);

    const result = await pool.query(`
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
      WHERE specialtyid = $1
    `, [id]);

    await pool.end();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Specialty not found',
          details: `No specialty found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    console.log('Specialty found:', result.rows[0].name);

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching specialty:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch specialty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('=== UPDATE SPECIALTY ===');
    
    const { Pool } = await import('pg');
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    const { id } = await context.params;
    const body = await request.json();
    
    const {
      name,
      description,
      department_id,
      code,
      is_active
    } = body;

    if (!name || !code) {
      await pool.end();
      return NextResponse.json(
        { 
          error: 'Missing required fields',
          required: ['name', 'code']
        },
        { status: 400 }
      );
    }

    console.log('Updating specialty:', id, 'with data:', { name, code });

    const result = await pool.query(`
      UPDATE specialties 
      SET name = $1, description = $2, departmentid = $3, code = $4, is_active = $5, updatedat = NOW()
      WHERE specialtyid = $6
      RETURNING specialtyid, name, description, departmentid, code, is_active, createdat, updatedat
    `, [
      name,
      description || null,
      department_id || null,
      code,
      is_active !== undefined ? is_active : true,
      id
    ]);

    await pool.end();

    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Specialty not found',
          details: `No specialty found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    console.log('Specialty updated successfully:', result.rows[0].name);

    return NextResponse.json({
      success: true,
      message: 'Specialty updated successfully',
      data: {
        id: result.rows[0].specialtyid,
        name: result.rows[0].name,
        description: result.rows[0].description,
        department_id: result.rows[0].departmentid,
        code: result.rows[0].code,
        is_active: result.rows[0].is_active,
        created_at: result.rows[0].createdat,
        updated_at: result.rows[0].updatedat
      }
    });

  } catch (error) {
    console.error('Error updating specialty:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update specialty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('=== DELETE SPECIALTY ===');
    
    const { Pool } = await import('pg');
    const databaseUrl = process.env.OPENEHR_DATABASE_URL;
    
    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });

    const { id } = await context.params;
    console.log('Deleting specialty with ID:', id);

    // Check if specialty exists
    const existingSpecialty = await pool.query(
      'SELECT specialtyid FROM specialties WHERE specialtyid = $1',
      [id]
    );

    if (existingSpecialty.rows.length === 0) {
      await pool.end();
      return NextResponse.json(
        { 
          error: 'Specialty not found',
          details: `No specialty found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    // Delete the specialty
    await pool.query('DELETE FROM specialties WHERE specialtyid = $1', [id]);

    await pool.end();

    console.log('Specialty deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Specialty deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting specialty:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete specialty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
