import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      code, 
      name_ar, 
      contact_person, 
      contact_phone, 
      contact_email, 
      address, 
      coverage_percentage, 
      active 
    } = body;

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updateFields.push(`company_name = $${paramIndex}`);
      updateValues.push(name);
      paramIndex++;
    }
    if (code !== undefined) {
      updateFields.push(`company_code = $${paramIndex}`);
      updateValues.push(code);
      paramIndex++;
    }
    if (name_ar !== undefined) {
      updateFields.push(`company_name_ar = $${paramIndex}`);
      updateValues.push(name_ar);
      paramIndex++;
    }
    if (contact_person !== undefined) {
      updateFields.push(`contact_person = $${paramIndex}`);
      updateValues.push(contact_person);
      paramIndex++;
    }
    if (contact_phone !== undefined) {
      updateFields.push(`contact_phone = $${paramIndex}`);
      updateValues.push(contact_phone);
      paramIndex++;
    }
    if (contact_email !== undefined) {
      updateFields.push(`contact_email = $${paramIndex}`);
      updateValues.push(contact_email);
      paramIndex++;
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramIndex}`);
      updateValues.push(address);
      paramIndex++;
    }
    if (coverage_percentage !== undefined) {
      updateFields.push(`coverage_percentage = $${paramIndex}`);
      updateValues.push(parseFloat(coverage_percentage) || 0);
      paramIndex++;
    }
    if (active !== undefined) {
      updateFields.push(`active = $${paramIndex}`);
      updateValues.push(active);
      paramIndex++;
    }

    // Always update the timestamp
    updateFields.push(`updatedat = NOW()`);

    if (updateFields.length === 1) { // Only the timestamp was added
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add the WHERE condition parameter
    updateValues.push(id);

    const result = await pool.query(`
      UPDATE insurance_companies SET
        ${updateFields.join(', ')}
      WHERE company_id = $${paramIndex}
      RETURNING *
    `, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Insurance company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Insurance company updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating insurance company:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update insurance company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    const { id } = await params;

    // Check if company exists
    const checkResult = await pool.query(
      'SELECT company_name FROM insurance_companies WHERE company_id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Insurance company not found' },
        { status: 404 }
      );
    }

    // Delete the company
    await pool.query(
      'DELETE FROM insurance_companies WHERE company_id = $1',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Insurance company deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting insurance company:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete insurance company',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
