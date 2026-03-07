import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('GET /api/invoice-returns/[id] - Request received');
    
    if (!pool) {
      console.error('Database pool not configured');
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Await params for Next.js 16
    const { id: paramId } = await params;
    
    // If params.id is undefined, try to extract from URL
    let id = paramId;
    if (!id) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      id = pathParts[pathParts.length - 1];
      console.log('Extracted ID from URL:', id);
    } else {
      console.log('Extracted ID from params:', id);
    }

    if (!id) {
      console.log('No ID found in params or URL');
      return NextResponse.json(
        { error: 'Invoice return ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(`
      SELECT 
        id,
        return_number,
        return_date,
        invoice_id,
        invoice_number,
        patient_id,
        patient_name,
        patient_name_ar,
        reason_ar,
        reason_en,
        return_amount,
        refund_method,
        refund_date,
        refund_reference,
        status,
        approved_by,
        approved_at,
        notes,
        created_at,
        updated_at
      FROM invoice_returns
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice return not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching invoice return:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice return',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('PUT /api/invoice-returns/[id] - Request received');
    
    if (!pool) {
      console.error('Database pool not configured');
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Await params for Next.js 16
    const { id: paramId } = await params;
    
    // If params.id is undefined, try to extract from URL
    let id = paramId;
    if (!id) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      id = pathParts[pathParts.length - 1];
      console.log('Extracted ID from URL:', id);
    } else {
      console.log('Extracted ID from params:', id);
    }

    if (!id) {
      console.log('No ID found in params or URL');
      return NextResponse.json(
        { error: 'Invoice return ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    // Add fields dynamically if they exist in the body
    if (body.return_date !== undefined) {
      updateFields.push(`return_date = $${paramIndex}`);
      updateValues.push(body.return_date);
      paramIndex++;
    }
    if (body.reason_ar !== undefined) {
      updateFields.push(`reason_ar = $${paramIndex}`);
      updateValues.push(body.reason_ar);
      paramIndex++;
    }
    if (body.reason_en !== undefined) {
      updateFields.push(`reason_en = $${paramIndex}`);
      updateValues.push(body.reason_en);
      paramIndex++;
    }
    if (body.return_amount !== undefined) {
      updateFields.push(`return_amount = $${paramIndex}`);
      updateValues.push(body.return_amount);
      paramIndex++;
    }
    if (body.refund_method !== undefined) {
      updateFields.push(`refund_method = $${paramIndex}`);
      updateValues.push(body.refund_method);
      paramIndex++;
    }
    if (body.refund_date !== undefined) {
      updateFields.push(`refund_date = $${paramIndex}`);
      updateValues.push(body.refund_date);
      paramIndex++;
    }
    if (body.refund_reference !== undefined) {
      updateFields.push(`refund_reference = $${paramIndex}`);
      updateValues.push(body.refund_reference);
      paramIndex++;
    }
    if (body.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(body.status);
      paramIndex++;
    }
    if (body.approved_by !== undefined) {
      updateFields.push(`approved_by = $${paramIndex}`);
      updateValues.push(body.approved_by);
      paramIndex++;
    }
    if (body.approved_at !== undefined) {
      updateFields.push(`approved_at = $${paramIndex}`);
      updateValues.push(body.approved_at);
      paramIndex++;
    }
    if (body.notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(body.notes);
      paramIndex++;
    }
    if (body.updated_by !== undefined) {
      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(body.updated_by);
      paramIndex++;
    }

    // Always update the timestamp
    updateFields.push(`updated_at = NOW()`);

    if (updateFields.length === 1) { // Only the timestamp was added
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Add the WHERE condition parameter
    updateValues.push(id);

    console.log('Update fields:', updateFields);
    console.log('Update values:', updateValues);

    const result = await pool.query(`
      UPDATE invoice_returns SET
        ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice return not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Invoice return updated: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Invoice return updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating invoice return:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update invoice return',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('DELETE /api/invoice-returns/[id] - Request received');
    
    if (!pool) {
      console.error('Database pool not configured');
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Await params for Next.js 16
    const { id: paramId } = await params;
    
    // If params.id is undefined, try to extract from URL
    let id = paramId;
    if (!id) {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      id = pathParts[pathParts.length - 1];
      console.log('Extracted ID from URL:', id);
    } else {
      console.log('Extracted ID from params:', id);
    }

    if (!id) {
      console.log('No ID found in params or URL');
      return NextResponse.json(
        { error: 'Invoice return ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query('DELETE FROM invoice_returns WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice return not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Invoice return deleted: ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Invoice return deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting invoice return:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete invoice return',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
