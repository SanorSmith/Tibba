import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    
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


    const { id } = await context.params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

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
      WHERE specialtyid = $1 AND workspaceid = $2
    `, [id, workspaceId]);


    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Specialty not found',
          details: `No specialty found with ID: ${id}`
        },
        { status: 404 }
      );
    }


    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

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


    const { id } = await context.params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {
    const body = await request.json();
    
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


    const result = await pool.query(`
      UPDATE specialties 
      SET name = $1, description = $2, departmentid = $3, code = $4, is_active = $5, updatedat = NOW()
      WHERE specialtyid = $6 AND workspaceid = $7
      RETURNING specialtyid, name, description, departmentid, code, is_active, createdat, updatedat
    `, [
      name,
      description || null,
      department_id || null,
      code,
      is_active !== undefined ? is_active : true,
      id,
      workspaceId
    ]);


    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Specialty not found',
          details: `No specialty found with ID: ${id}`
        },
        { status: 404 }
      );
    }


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


    const { id } = await context.params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    // Check if specialty exists
    const existingSpecialty = await pool.query(
      'SELECT specialtyid FROM specialties WHERE specialtyid = $1 AND workspaceid = $2',
      [id, workspaceId]
    );

    if (existingSpecialty.rows.length === 0) {
      return NextResponse.json(
        { 
          error: 'Specialty not found',
          details: `No specialty found with ID: ${id}`
        },
        { status: 404 }
      );
    }

    // Delete the specialty
    await pool.query('DELETE FROM specialties WHERE specialtyid = $1 AND workspaceid = $2', [id, workspaceId]);



    return NextResponse.json({
      success: true,
      message: 'Specialty deleted successfully'
    });

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
