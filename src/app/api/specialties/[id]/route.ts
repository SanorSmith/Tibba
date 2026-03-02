/**
 * Individual Specialty API - CRUD Operations
 * GET /api/specialties/[id] - Get specific specialty
 * PUT /api/specialties/[id] - Update specific specialty
 * DELETE /api/specialties/[id] - Delete specific specialty
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

// Helper function to get ID from request
function getIdFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  return pathSegments[pathSegments.length - 1] || null;
}

// GET /api/specialties/[id] - Get specific specialty
export async function GET(request: NextRequest) {
  try {
    const specialtyId = getIdFromRequest(request);
    
    if (!specialtyId) {
      return NextResponse.json(
        { error: 'Specialty ID is required' },
        { status: 400 }
      );
    }

    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Fetching specialty:', specialtyId);

    const result = await pool!.query(
      `SELECT specialtyid as id, name, description, departmentid as department_id, 
              code, is_active, createdat as created_at, updatedat as updated_at
       FROM specialties 
       WHERE specialtyid = $1`,
      [specialtyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Specialty not found' },
        { status: 404 }
      );
    }

    const specialty = result.rows[0];
    const transformedData = {
      id: specialty.id,
      name: specialty.name,
      description: specialty.description,
      department_id: specialty.department_id,
      code: specialty.code,
      is_active: specialty.is_active,
      created_at: specialty.created_at,
      updated_at: specialty.updated_at
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Specialty fetch error:', error);
    
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Specialties table not found',
          details: 'The specialties table does not exist in the database'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch specialty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/specialties/[id] - Update specific specialty
export async function PUT(request: NextRequest) {
  try {
    const specialtyId = getIdFromRequest(request);
    
    if (!specialtyId) {
      return NextResponse.json(
        { error: 'Specialty ID is required' },
        { status: 400 }
      );
    }

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
    console.log('Updating specialty:', specialtyId, body);

    // Check if specialty exists
    const existingSpecialty = await pool!.query(
      'SELECT specialtyid FROM specialties WHERE specialtyid = $1',
      [specialtyId]
    );

    if (existingSpecialty.rows.length === 0) {
      return NextResponse.json(
        { error: 'Specialty not found' },
        { status: 404 }
      );
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(body.name.trim());
    }

    if (body.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(body.description || null);
    }

    if (body.department_id !== undefined) {
      updateFields.push(`departmentid = $${paramIndex++}`);
      updateValues.push(body.department_id.trim());
    }

    if (body.code !== undefined) {
      updateFields.push(`code = $${paramIndex++}`);
      updateValues.push(body.code.trim());
    }

    if (body.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(body.is_active);
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Add updated_at timestamp and specialty ID
    updateFields.push(`updatedat = NOW()`);
    updateValues.push(specialtyId);

    const updateQuery = `
      UPDATE specialties 
      SET ${updateFields.join(', ')}
      WHERE specialtyid = $${paramIndex}
      RETURNING specialtyid, name, description, departmentid, code, is_active, createdat, updatedat
    `;

    const result = await pool!.query(updateQuery, updateValues);

    console.log('Specialty updated successfully:', result.rows[0]);

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
      message: 'Specialty updated successfully',
      data: transformedData
    });

  } catch (error) {
    console.error('Specialty update error:', error);
    
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Specialties table not found',
          details: 'The specialties table does not exist in the database'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to update specialty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/specialties/[id] - Delete specific specialty
export async function DELETE(request: NextRequest) {
  try {
    const specialtyId = getIdFromRequest(request);
    
    if (!specialtyId) {
      return NextResponse.json(
        { error: 'Specialty ID is required' },
        { status: 400 }
      );
    }

    if (!databaseUrl) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'OPENEHR_DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    console.log('Deleting specialty:', specialtyId);

    // Check if specialty exists
    const existingSpecialty = await pool!.query(
      'SELECT specialtyid, name FROM specialties WHERE specialtyid = $1',
      [specialtyId]
    );

    if (existingSpecialty.rows.length === 0) {
      return NextResponse.json(
        { error: 'Specialty not found' },
        { status: 404 }
      );
    }

    // Check if specialty is being used by any staff members
    const staffWithSpecialty = await pool!.query(
      'SELECT COUNT(*) as count FROM staff WHERE specialty = (SELECT name FROM specialties WHERE specialtyid = $1)',
      [specialtyId]
    );

    if (parseInt(staffWithSpecialty.rows[0].count) > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete specialty',
          details: 'This specialty is currently assigned to staff members. Please reassign or remove staff members before deleting this specialty.',
          staff_count: parseInt(staffWithSpecialty.rows[0].count)
        },
        { status: 400 }
      );
    }

    // Delete the specialty
    await pool!.query('DELETE FROM specialties WHERE specialtyid = $1', [specialtyId]);

    console.log('Specialty deleted successfully:', existingSpecialty.rows[0].name);

    return NextResponse.json({
      success: true,
      message: 'Specialty deleted successfully',
      data: {
        id: specialtyId,
        name: existingSpecialty.rows[0].name
      }
    });

  } catch (error) {
    console.error('Specialty deletion error:', error);
    
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json(
        { 
          error: 'Specialties table not found',
          details: 'The specialties table does not exist in the database'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to delete specialty',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
