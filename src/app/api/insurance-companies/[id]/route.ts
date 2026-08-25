import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';
import { ensureSchema } from '@/lib/db/ensure-schema';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not configured in environment variables');
}


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
      code,
      name_ar,
      // The Edit Insurance Company form submits nested contact/address/metadata
      // objects — accept those (falling back to flat fields for older callers).
      contact = {},
      address: addressObj = {},
      metadata = {},
      contact_person = contact.contact_person,
      contact_phone = contact.phone,
      contact_email = contact.email,
      website = contact.website,
      address = addressObj.address_line1,
      city = addressObj.city,
      province = addressObj.province,
      coverage_percentage,
      active,
    } = body;
    const discount_percentage = metadata.default_discount_percentage;
    const copay_percentage = metadata.default_copay_percentage;
    const payment_terms_days = metadata.claim_payment_terms_days;
    const contract_start_date = metadata.contract_start_date;
    const contract_end_date = metadata.contract_end_date;
    const coverage_limit = metadata.coverage_limit;
    const notes = metadata.notes;

    // Self-migrate: same contract/policy columns the list route adds — needed
    // here too since edits can land on a DB that's never hit the GET route.
    await ensureSchema(`
      ALTER TABLE insurance_companies
        ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS copay_percentage NUMERIC(5,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30,
        ADD COLUMN IF NOT EXISTS contract_start_date DATE,
        ADD COLUMN IF NOT EXISTS contract_end_date DATE,
        ADD COLUMN IF NOT EXISTS coverage_limit NUMERIC(14,2),
        ADD COLUMN IF NOT EXISTS website VARCHAR(255),
        ADD COLUMN IF NOT EXISTS city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS province VARCHAR(100),
        ADD COLUMN IF NOT EXISTS notes TEXT
    `).catch(() => {});

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
    if (website !== undefined) {
      updateFields.push(`website = $${paramIndex}`);
      updateValues.push(website);
      paramIndex++;
    }
    if (city !== undefined) {
      updateFields.push(`city = $${paramIndex}`);
      updateValues.push(city);
      paramIndex++;
    }
    if (province !== undefined) {
      updateFields.push(`province = $${paramIndex}`);
      updateValues.push(province);
      paramIndex++;
    }
    if (discount_percentage !== undefined) {
      updateFields.push(`discount_percentage = $${paramIndex}`);
      updateValues.push(parseFloat(discount_percentage) || 0);
      paramIndex++;
    }
    if (copay_percentage !== undefined) {
      updateFields.push(`copay_percentage = $${paramIndex}`);
      updateValues.push(parseFloat(copay_percentage) || 0);
      paramIndex++;
    }
    if (payment_terms_days !== undefined) {
      updateFields.push(`payment_terms_days = $${paramIndex}`);
      updateValues.push(parseInt(payment_terms_days) || 30);
      paramIndex++;
    }
    if (contract_start_date !== undefined) {
      updateFields.push(`contract_start_date = $${paramIndex}`);
      updateValues.push(contract_start_date || null);
      paramIndex++;
    }
    if (contract_end_date !== undefined) {
      updateFields.push(`contract_end_date = $${paramIndex}`);
      updateValues.push(contract_end_date || null);
      paramIndex++;
    }
    if (coverage_limit !== undefined) {
      updateFields.push(`coverage_limit = $${paramIndex}`);
      updateValues.push(coverage_limit || null);
      paramIndex++;
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`);
      updateValues.push(notes || null);
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
      WHERE company_id = $${paramIndex} AND workspaceid = $${paramIndex + 1}
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
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    // Check if company exists
    const checkResult = await pool.query(
      'SELECT company_name FROM insurance_companies WHERE company_id = $1 AND workspaceid = $2',
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
      'DELETE FROM insurance_companies WHERE company_id = $1 AND workspaceid = $2',
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Insurance company deleted successfully'
    });

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
