/**
 * Individual Department API
 * GET /api/departments/[id] - Get single department
 * PUT /api/departments/[id] - Update department
 * DELETE /api/departments/[id] - Delete department
 */

import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Neon database connection
const pool = new Pool({
  connectionString: process.env.OPENEHR_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Helper function to extract ID from URL
function getIdFromRequest(request: NextRequest): string | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  return pathSegments[pathSegments.length - 1] || null;
}

// GET /api/departments/[id] - Get single department
export async function GET(request: NextRequest) {
  try {
    const id = getIdFromRequest(request);
    
    if (!process.env.OPENEHR_DATABASE_URL) {
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

    console.log('Fetching single department:', id);
    
    const result = await pool.query(
      `SELECT departmentid as id, name, phone as contact_phone, email as contact_email, 
              address as location, createdat as created_at, updatedat as updated_at
       FROM departments 
       WHERE departmentid = $1`,
      [id]
    );

    console.log('Department query result:', result.rows.length, 'rows found');

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Department not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected interface
    const transformedData = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      name_ar: null,
      code: result.rows[0].name.substring(0, 3).toUpperCase(),
      description: null,
      head_of_department: null,
      contact_email: result.rows[0].contact_email,
      contact_phone: result.rows[0].contact_phone,
      location: result.rows[0].location,
      capacity: null,
      is_active: true,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Department fetch error:', error);
    
    // Check if it's a connection error
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('connection') ||
          error.message.includes('authentication')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            details: error.message
          },
          { status: 500 }
        );
      }
      
      if (error.message.includes('does not exist') || 
          error.message.includes('relation "departments" does not exist')) {
        return NextResponse.json(
          { 
            error: 'Departments table not found',
            details: 'The departments table does not exist in the database'
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch department',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/departments/[id] - Update department
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    if (!process.env.OPENEHR_DATABASE_URL) {
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
export async function DELETE(request: NextRequest) {
  try {
    const id = getIdFromRequest(request);
    
    if (!process.env.OPENEHR_DATABASE_URL) {
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
