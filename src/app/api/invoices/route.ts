import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';
import { ensureSchema } from '@/lib/db/ensure-schema';

// Updated: Fixed duplicate PUT handlers - 2026-03-07
// Fixed controlled input warnings - 2026-03-07

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}


export async function GET(request: NextRequest) {
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

    // Only ever return invoices belonging to the caller's facility. No session
    // means no facility, which must show nothing rather than everything.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM invoices WHERE workspaceid = $1',
      [workspaceId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Get invoices with pagination
    // latest_claim_status/latest_claim_id: most recent insurance claim tied to this
    // invoice, if any — lets the UI hide "Submit Insurance Claim" once a claim
    // already exists (e.g. was approved) instead of always showing it whenever
    // insurance_coverage_amount > 0.
    const invoicesResult = await pool.query(`
      SELECT
        i.id,
        i.invoice_number,
        i.invoice_date,
        i.patient_id,
        i.patient_name,
        i.patient_name_ar,
        i.subtotal,
        i.discount_percentage,
        i.discount_amount,
        i.total_amount,
        i.insurance_company_id,
        i.insurance_coverage_amount,
        i.insurance_coverage_percentage,
        i.patient_responsibility,
        i.amount_paid,
        i.balance_due,
        i.status,
        i.payment_method,
        i.payment_date,
        i.notes,
        i.createdat,
        i.updatedat,
        lc.id AS latest_claim_id,
        lc.status AS latest_claim_status
      FROM invoices i
      LEFT JOIN LATERAL (
        SELECT id, status
        FROM insurance_claims
        WHERE invoice_id = i.id::varchar
        ORDER BY created_at DESC
        LIMIT 1
      ) lc ON true
      WHERE i.workspaceid = $3
      ORDER BY i.createdat DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset, workspaceId]);

    return NextResponse.json({
      success: true,
      data: invoicesResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/invoices - Request received');
    
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

    // Stamp the new invoice with the facility the caller is working in, so it
    // is only ever visible to that facility.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));

    // Generate invoice number if not provided
    const invoice_number = body.invoice_number || `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    
    const {
      invoice_date,
      patient_id,
      patient_name,
      patient_name_ar,
      insurance_company_id,
      status,
      payment_method,
      payment_date,
      notes,
      authorization_number,
      items
    } = body;

    // Get service prices for items that don't have unit_price
    let servicePrices: Record<string, number> = {};
    if (items && Array.isArray(items)) {
      console.log('Items received:', items);
      const serviceCodes = items
        .filter(item => !item.unit_price && (item.service_id || item.item_code))
        .map(item => item.service_id || item.item_code);
      
      console.log('Service codes to fetch:', serviceCodes);
      
      if (serviceCodes.length > 0) {
        try {
          // Try to fetch by code first (for frontend compatibility)
          const pricesResult = await pool.query(
            `SELECT code, id, price FROM services WHERE code = ANY($1) OR id = ANY($1)`,
            [serviceCodes]
          );
          console.log('Price query result:', pricesResult.rows);
          servicePrices = pricesResult.rows.reduce((acc, row) => {
            // Store by both code and id for flexibility
            acc[row.code] = parseFloat(row.price) || 0;
            acc[row.id] = parseFloat(row.price) || 0;
            return acc;
          }, {} as Record<string, number>);
          console.log('Fetched service prices:', servicePrices);
        } catch (priceError) {
          console.error('Error fetching service prices:', priceError);
          // Continue without prices - will use 0 as default
        }
      }
    }
    
    // Calculate totals from items if not provided
    const calculatedSubtotal = items && Array.isArray(items) 
      ? items.reduce((sum, item) => {
          const serviceId = item.service_id || item.item_code || '';
          const unitPrice = item.unit_price || servicePrices[serviceId] || 0;
          const quantity = item.quantity || 1;
          const itemTotal = unitPrice * quantity;
          console.log(`Item: ${serviceId}, unitPrice: ${unitPrice}, quantity: ${quantity}, total: ${itemTotal}`);
          return sum + itemTotal;
        }, 0)
      : 0;
    
    console.log('Calculated subtotal:', calculatedSubtotal);
    console.log('Body subtotal:', body.subtotal);
    const subtotal = body.subtotal ?? calculatedSubtotal;
    console.log('Final subtotal:', subtotal);
    const discount_percentage = body.discount_percentage ?? 0;
    const discount_amount = body.discount_amount ?? Math.round(subtotal * discount_percentage / 100);
    const total_amount = body.total_amount ?? (subtotal - discount_amount);
    const insurance_coverage_percentage = body.insurance_coverage_percentage ?? 0;
    const insurance_coverage_amount = body.insurance_coverage_amount ?? Math.round(total_amount * insurance_coverage_percentage / 100);
    const patient_responsibility = body.patient_responsibility ?? (total_amount - insurance_coverage_amount);
    const amount_paid = body.amount_paid ?? 0;

    // What is still owed on this invoice, computed here rather than taken
    // from the request.
    //
    // Two things were wrong. The browser could send any balance it liked and
    // it was written down unquestioned. And when it sent none, the fallback
    // subtracted from `patient_responsibility` instead of from the invoice
    // total - on an insured invoice those differ by exactly the insurer's
    // share, so the row could not add up. Twenty-three of the sixty invoices
    // in Hospital 1 do not, insured ones failing at three times the rate of
    // uninsured, and sixteen of them match this formula precisely.
    //
    // The total is what is owed to the facility, whoever settles it. The
    // insurer's share is a fact about who pays, not about how much. Nothing
    // is clamped at zero: overpaying gives a negative balance, which is the
    // honest way to record money owed back, and it keeps total, paid and
    // balance adding up - now enforced by a check constraint in migration
    // 0095, so a wrong figure is refused rather than stored.
    const balance_due = total_amount - amount_paid;
    
    console.log('Generated invoice number:', invoice_number);
    console.log('Calculated values:', {
      subtotal,
      discount_percentage,
      discount_amount,
      total_amount,
      insurance_coverage_percentage,
      insurance_coverage_amount,
      patient_responsibility,
      amount_paid,
      balance_due
    });

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Insert main invoice record
      const invoiceResult = await pool.query(`
        INSERT INTO invoices (
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
          authorization_number,
          workspaceid,
          createdat,
          updatedat
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW(), NOW()
        ) RETURNING *
      `, [
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
        authorization_number || null,
        workspaceId
      ]);

      const newInvoice = invoiceResult.rows[0];

      // Insert invoice items if provided
      if (items && Array.isArray(items) && items.length > 0) {
        console.log(`Inserting ${items.length} invoice items`);
        
        // Each line item can carry the receptionist's chosen provider (stakeholder)
        await ensureSchema(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS stakeholder_id UUID`).catch(() => {});
        // Line items pulled from OpenEHR carry provenance so we can detect already-paid orders on re-pull
        await ensureSchema(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS openehr_source_uid VARCHAR(255)`).catch(() => {});
        await ensureSchema(`ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS openehr_order_id VARCHAR(255)`).catch(() => {});

        for (const item of items) {
          const serviceId = item.service_id || item.item_code || '';
          const unitPrice = item.unit_price || servicePrices[serviceId] || 0;
          const quantity = item.quantity || 1;
          const totalPrice = item.subtotal || item.total_price || (quantity * unitPrice);
          // Chosen provider for this line; 'ALL' (or empty) means split across all configured providers
          const chosenStakeholder =
            item.stakeholder_id && item.stakeholder_id !== 'ALL' ? item.stakeholder_id : null;

          const itemData = {
            invoice_id: newInvoice.id,
            service_id: serviceId,
            service_name: item.service_name || item.item_name || '',
            service_name_ar: item.service_name_ar || item.item_name_ar || '',
            quantity: quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            stakeholder_id: chosenStakeholder,
            openehr_source_uid: item.openehr_source_uid || null,
            openehr_order_id: item.openehr_order_id || null,
          };

          console.log('Inserting item:', itemData);

          await pool.query(`
            INSERT INTO invoice_items (
              invoice_id,
              service_id,
              service_name,
              service_name_ar,
              quantity,
              unit_price,
              total_price,
              stakeholder_id,
              openehr_source_uid,
              openehr_order_id
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
            )
          `, [
            itemData.invoice_id,
            itemData.service_id,
            itemData.service_name,
            itemData.service_name_ar,
            itemData.quantity,
            itemData.unit_price,
            itemData.total_price,
            itemData.stakeholder_id,
            itemData.openehr_source_uid,
            itemData.openehr_order_id,
          ]);
        }
        console.log('All items inserted successfully');
      }

      // ── Auto-create invoice_shares from service_stakeholders config ──
      // For each saved item, look up which stakeholders are configured for that
      // service (joined via services.code = invoice_items.service_id) and
      // insert a PENDING invoice_shares row for each.
      try {
        const savedItemsRes = await pool.query(
          'SELECT id, service_id, stakeholder_id, total_price FROM invoice_items WHERE invoice_id = $1',
          [newInvoice.id]
        );
        let sharesInserted = 0;
        for (const savedItem of savedItemsRes.rows) {
          if (!savedItem.service_id) continue;
          // Match configured providers by service UUID OR legacy service code.
          // If the receptionist chose a specific provider for this line, keep only that one;
          // otherwise fall back to all configured providers (split).
          const stkRes = await pool.query(
            `SELECT ss.stakeholder_id, ss.provider_role, ss.share_type,
                    ss.share_percentage, ss.share_amount AS fixed_amount
             FROM service_stakeholders ss
             JOIN services s ON ss.service_id = s.id
             WHERE (s.id::text = $1 OR s.code = $1)
               AND ss.is_active = true
               AND ($2::uuid IS NULL OR ss.stakeholder_id = $2::uuid)`,
            [savedItem.service_id, savedItem.stakeholder_id]
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
                newInvoice.id, savedItem.id, savedItem.service_id,
                stk.stakeholder_id, stk.provider_role, stk.share_type,
                stk.share_percentage ?? null, shareAmt,
              ]
            );
            sharesInserted++;
          }
        }
        console.log(`Auto-created ${sharesInserted} invoice_shares for invoice ${newInvoice.id}`);
      } catch (shareErr) {
        // Non-fatal: shares can be recreated later; don't fail the whole invoice
        console.error('Warning: invoice_shares auto-creation failed:', shareErr);
      }

      // Commit transaction
      await pool.query('COMMIT');

      return NextResponse.json({
        success: true,
        message: 'Invoice created successfully',
        data: newInvoice
      });

    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      throw error;
    }

    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to create invoice',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Deleting an invoice and its items — must be one of ours.
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {
    if (!pool) {
      return NextResponse.json(
        { 
          error: 'Database not configured',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    // Get invoice ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const invoiceId = pathParts[pathParts.length - 1];

    if (!invoiceId || invoiceId === 'invoices') {
      return NextResponse.json(
        { error: 'Invoice ID is required in URL path' },
        { status: 400 }
      );
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Confirm the invoice is ours before removing anything. The items are
      // keyed by invoice_id alone, so without this an invoice belonging to
      // another facility could be emptied and then deleted.
      const owns = await pool.query(
        'SELECT 1 FROM invoices WHERE id = $1 AND workspaceid = $2',
        [invoiceId, workspaceId]
      );
      if (owns.rows.length === 0) {
        await pool.query('ROLLBACK');
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Delete invoice items first
      await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);

      // Delete invoice
      const result = await pool.query(
        'DELETE FROM invoices WHERE id = $1 AND workspaceid = $2 RETURNING *',
        [invoiceId, workspaceId]
      );

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

    });
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

