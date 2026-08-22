import { NextRequest, NextResponse } from 'next/server';
import { postInvoicePayment } from '@/lib/gl-posting';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}


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

    // Scoped to the caller's facility — an invoice id from another hospital
    // must read as "not found", not be served.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Get invoice
    const result = await pool.query(`
      SELECT * FROM invoices WHERE id = $1 AND workspaceid = $2
    `, [id, workspaceId]);

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

    // Map items to frontend-expected format.
    // openehr_source_uid/openehr_order_id were previously dropped here even
    // though they're stored — without them the Edit modal can't tell an
    // OpenEHR-pulled line (e.g. a surgery order with no catalog service_id)
    // from a regular one, so it tried to fit it into the services dropdown
    // and showed a blank "Select service..." instead of the actual procedure.
    const mappedItems = items.map(item => ({
      id: item.id,
      item_code: item.service_id,
      item_name: item.service_name,
      item_name_ar: item.service_name_ar,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.total_price,
      provider_id: item.provider_id,
      provider_name: item.provider_name,
      service_fee: item.service_fee,
      stakeholder_id: item.stakeholder_id,
      openehr_source_uid: item.openehr_source_uid,
      openehr_order_id: item.openehr_order_id,
      createdat: item.createdat
    }));

    console.log('🔍 API Debug - Invoice GET:');
    console.log('- Invoice ID:', invoice.id);
    console.log('- Items count (raw):', items.length);
    console.log('- Items count (mapped):', mappedItems.length);
    if (mappedItems.length > 0) {
      console.log('- First item (mapped):', mappedItems[0]);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...invoice,
        items: mappedItems
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

    // Refuse to edit another facility's invoice.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    const ownedPut = await pool.query(
      'SELECT 1 FROM invoices WHERE id = $1 AND workspaceid = $2',
      [id, workspaceId]
    );
    if (ownedPut.rowCount === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
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
        updateValues.push(parseFloat(subtotal) || 0);
        paramIndex++;
      }
      if (discount_percentage !== undefined) {
        updateFields.push(`discount_percentage = $${paramIndex}`);
        updateValues.push(parseFloat(discount_percentage) || 0);
        paramIndex++;
      }
      if (discount_amount !== undefined) {
        updateFields.push(`discount_amount = $${paramIndex}`);
        updateValues.push(parseFloat(discount_amount) || 0);
        paramIndex++;
      }
      if (total_amount !== undefined) {
        updateFields.push(`total_amount = $${paramIndex}`);
        updateValues.push(parseFloat(total_amount) || 0);
        paramIndex++;
      }
      if (insurance_company_id !== undefined) {
        updateFields.push(`insurance_company_id = $${paramIndex}`);
        updateValues.push(insurance_company_id);
        paramIndex++;
      }
      if (insurance_coverage_amount !== undefined) {
        updateFields.push(`insurance_coverage_amount = $${paramIndex}`);
        updateValues.push(parseFloat(insurance_coverage_amount) || 0);
        paramIndex++;
      }
      if (insurance_coverage_percentage !== undefined) {
        updateFields.push(`insurance_coverage_percentage = $${paramIndex}`);
        updateValues.push(parseFloat(insurance_coverage_percentage) || 0);
        paramIndex++;
      }
      if (patient_responsibility !== undefined) {
        updateFields.push(`patient_responsibility = $${paramIndex}`);
        updateValues.push(parseFloat(patient_responsibility) || 0);
        paramIndex++;
      }
      if (amount_paid !== undefined) {
        updateFields.push(`amount_paid = $${paramIndex}`);
        updateValues.push(parseFloat(amount_paid) || 0);
        paramIndex++;
      }
      if (balance_due !== undefined) {
        updateFields.push(`balance_due = $${paramIndex}`);
        updateValues.push(parseFloat(balance_due) || 0);
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
        console.log(`Processing ${items.length} items...`);
        console.log('Items data:', JSON.stringify(items, null, 2));
        
        // Delete existing invoice items (and their PENDING shares — PAID shares are kept)
        await pool.query(
          `DELETE FROM invoice_shares WHERE invoice_id = $1 AND payment_status = 'PENDING'`,
          [id]
        );
        await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
        console.log('Deleted existing items and pending shares');

        // Insert new invoice items
        if (items.length > 0) {
          for (const item of items) {
            console.log('Processing item:', item);
            
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
              item.subtotal || item.total_price || (item.quantity || 1) * (item.unit_price || 0)
            ]);
          }
          console.log('Inserted new items');
        }

        // ── Auto-recreate invoice_shares from service_stakeholders config ──
        try {
          const savedItemsRes = await pool.query(
            'SELECT id, service_id, total_price FROM invoice_items WHERE invoice_id = $1',
            [id]
          );
          let sharesInserted = 0;
          for (const savedItem of savedItemsRes.rows) {
            if (!savedItem.service_id) continue;
            const stkRes = await pool.query(
              `SELECT ss.stakeholder_id, ss.provider_role, ss.share_type,
                      ss.share_percentage, ss.share_amount AS fixed_amount
               FROM service_stakeholders ss
               JOIN services s ON ss.service_id = s.id
               WHERE s.code = $1 AND ss.is_active = true`,
              [savedItem.service_id]
            );
            for (const stk of stkRes.rows) {
              const itemTotal = parseFloat(savedItem.total_price) || 0;
              const shareAmt =
                stk.share_type === 'PERCENTAGE'
                  ? (itemTotal * (parseFloat(stk.share_percentage) || 0)) / 100
                  : parseFloat(stk.fixed_amount) || 0;
              await pool.query(
                `INSERT INTO invoice_shares
                   (invoice_id, invoice_item_id, service_id, stakeholder_id, provider_role,
                    share_type, share_percentage, share_amount, payment_status, createdat, updatedat)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING',NOW(),NOW())
                 ON CONFLICT DO NOTHING`,
                [
                  id, savedItem.id, savedItem.service_id,
                  stk.stakeholder_id, stk.provider_role, stk.share_type,
                  stk.share_percentage ?? null, shareAmt,
                ]
              );
              sharesInserted++;
            }
          }
          console.log(`Auto-recreated ${sharesInserted} invoice_shares for invoice ${id}`);
        } catch (shareErr) {
          console.error('Warning: invoice_shares auto-recreation failed:', shareErr);
        }
      }

      // ── GL auto-posting when invoice is marked PAID ──────────────────
      if (status === 'PAID' || status === 'PARTIAL') {
        try {
          // Get the latest invoice snapshot for amounts
          const glInv = await pool.query(
            `SELECT invoice_number, total_amount, amount_paid, insurance_coverage_amount,
                    patient_responsibility, payment_date
             FROM invoices WHERE id = $1`, [id]
          );
          if (glInv.rows.length > 0) {
            const inv = glInv.rows[0];
            const patientAmt   = parseFloat(inv.patient_responsibility  || '0');
            const insuranceAmt = parseFloat(inv.insurance_coverage_amount || '0');
            const entryDate    = inv.payment_date
              ? new Date(inv.payment_date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0];

            // Use pool.connect() so GL uses same connection pool
            const glClient = await pool.connect();
            try {
              await glClient.query('BEGIN');
              await postInvoicePayment(
                glClient,
                workspaceId,
                id,
                inv.invoice_number,
                patientAmt,
                insuranceAmt,
                entryDate
              );
              await glClient.query('COMMIT');
            } catch (glErr) {
              await glClient.query('ROLLBACK');
              console.error('[GL] Invoice posting failed (non-fatal):', glErr);
            } finally {
              glClient.release();
            }
          }
        } catch (glErr) {
          console.error('[GL] GL posting setup failed (non-fatal):', glErr);
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

    // Refuse to delete another facility's invoice.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    const owned = await pool.query(
      'SELECT 1 FROM invoices WHERE id = $1 AND workspaceid = $2',
      [id, workspaceId]
    );
    if (owned.rowCount === 0) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
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
