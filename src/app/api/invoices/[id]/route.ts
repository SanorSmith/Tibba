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

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
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
    
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Get invoice
    const result = await pool.query(`
      SELECT * FROM invoices WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Get invoice items
    const itemsResult = await pool.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY createdat
    `, [id]);

    const invoice = result.rows[0];
    const items = itemsResult.rows || [];

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        items: items
      }
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('PUT request received for invoices API');
    console.log('Request URL:', request.url);
    
    if (!pool) {
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
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      invoice_number,
      invoice_date,
      patient_id,
      patient_name,
      patient_name_ar,
      subtotal,
      discount_percentage,
      discount_amount,
      total_amount,
      insurance_company_id,
      insurance_coverage_amount,
      insurance_coverage_percentage,
      patient_responsibility,
      amount_paid,
      balance_due,
      status,
      payment_method,
      payment_date,
      notes,
      items
    } = body;

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Build dynamic update query
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      // Add fields dynamically if they exist in the body
      if (invoice_number !== undefined) {
        updateFields.push(`invoice_number = $${paramIndex}`);
        updateValues.push(invoice_number);
        paramIndex++;
      }
      if (invoice_date !== undefined) {
        updateFields.push(`invoice_date = $${paramIndex}`);
        updateValues.push(invoice_date);
        paramIndex++;
      }
      if (patient_id !== undefined) {
        updateFields.push(`patient_id = $${paramIndex}`);
        updateValues.push(patient_id);
        paramIndex++;
      }
      if (patient_name !== undefined) {
        updateFields.push(`patient_name = $${paramIndex}`);
        updateValues.push(patient_name);
        paramIndex++;
      }
      if (patient_name_ar !== undefined) {
        updateFields.push(`patient_name_ar = $${paramIndex}`);
        updateValues.push(patient_name_ar);
        paramIndex++;
      }
      if (subtotal !== undefined) {
        updateFields.push(`subtotal = $${paramIndex}`);
        updateValues.push(subtotal);
        paramIndex++;
      }
      if (discount_percentage !== undefined) {
        updateFields.push(`discount_percentage = $${paramIndex}`);
        updateValues.push(discount_percentage);
        paramIndex++;
      }
      if (discount_amount !== undefined) {
        updateFields.push(`discount_amount = $${paramIndex}`);
        updateValues.push(discount_amount);
        paramIndex++;
      }
      if (total_amount !== undefined) {
        updateFields.push(`total_amount = $${paramIndex}`);
        updateValues.push(total_amount);
        paramIndex++;
      }
      if (insurance_company_id !== undefined) {
        updateFields.push(`insurance_company_id = $${paramIndex}`);
        updateValues.push(insurance_company_id);
        paramIndex++;
      }
      if (insurance_coverage_amount !== undefined) {
        updateFields.push(`insurance_coverage_amount = $${paramIndex}`);
        updateValues.push(insurance_coverage_amount);
        paramIndex++;
      }
      if (insurance_coverage_percentage !== undefined) {
        updateFields.push(`insurance_coverage_percentage = $${paramIndex}`);
        updateValues.push(insurance_coverage_percentage);
        paramIndex++;
      }
      if (patient_responsibility !== undefined) {
        updateFields.push(`patient_responsibility = $${paramIndex}`);
        updateValues.push(patient_responsibility);
        paramIndex++;
      }
      if (amount_paid !== undefined) {
        updateFields.push(`amount_paid = $${paramIndex}`);
        updateValues.push(amount_paid);
        paramIndex++;
      }
      if (balance_due !== undefined) {
        updateFields.push(`balance_due = $${paramIndex}`);
        updateValues.push(balance_due);
        paramIndex++;
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(status);
        paramIndex++;
      }
      if (payment_method !== undefined) {
        updateFields.push(`payment_method = $${paramIndex}`);
        updateValues.push(payment_method);
        paramIndex++;
      }
      if (payment_date !== undefined) {
        updateFields.push(`payment_date = $${paramIndex}`);
        updateValues.push(payment_date);
        paramIndex++;
      }
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(notes);
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

      const invoiceResult = await pool.query(`
        UPDATE invoices SET
          ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, updateValues);

      if (invoiceResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      const updatedInvoice = invoiceResult.rows[0];

      // Handle invoice items if provided
      if (items && Array.isArray(items)) {
        // Delete existing invoice items
        await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

        // Insert new invoice items
        if (items.length > 0) {
          for (const item of items) {
            await pool.query(`
              INSERT INTO invoice_items (
                invoice_id,
                service_id,
                service_name,
                service_name_ar,
                quantity,
                unit_price,
                total_price
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7
              )
            `, [
              id,
              item.service_id || item.item_code || '',
              item.service_name || item.item_name || '',
              item.service_name_ar || item.item_name_ar || '',
              item.quantity || 1,
              item.unit_price || 0,
              item.subtotal || (item.quantity || 1) * (item.unit_price || 0)
            ]);
          }
        }
      }

      // Commit transaction
      await pool.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Invoice updated successfully',
        data: updatedInvoice
      });

    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update invoice',
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
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Delete invoice items first
      await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);

      // Delete invoice
      const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        );
      }

      // Commit transaction
      await pool.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Invoice deleted successfully'
      });

    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
