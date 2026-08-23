import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';

// GET - Get single supplier
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    const { supplierId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const result = await query('SELECT * FROM suppliers WHERE supplierid = $1 AND workspaceid = $2', [supplierId, workspaceId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
    });
  } catch (error: any) {
    console.error('Get supplier error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

// PUT - Update supplier
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    const { supplierId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {
    const body = await request.json();
    const {
      code,
      name,
      category,
      type,
      phonenumber,
      email,
      contactperson,
      addressline1,
      city,
      state,
      country,
      postalcode,
      taxid,
      licensenumber,
      paymentterms,
      creditlimit,
      currency,
      ispreferred,
      isactive,
      updatedby,
    } = body;

    // Check if supplier exists
    const existing = await query('SELECT * FROM suppliers WHERE supplierid = $1 AND workspaceid = $2', [supplierId, workspaceId]);
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    const updates: string[] = ['updatedat = NOW()'];
    const values: any[] = [];
    let paramIndex = 1;

    if (code !== undefined) { updates.push(`code = $${paramIndex++}`); values.push(code); }
    if (name !== undefined) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (category !== undefined) { updates.push(`category = $${paramIndex++}`); values.push(category); }
    if (type !== undefined) { updates.push(`type = $${paramIndex++}`); values.push(type); }
    if (phonenumber !== undefined) { updates.push(`phonenumber = $${paramIndex++}`); values.push(phonenumber); }
    if (email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(email); }
    if (contactperson !== undefined) { updates.push(`contactperson = $${paramIndex++}`); values.push(contactperson); }
    if (addressline1 !== undefined) { updates.push(`addressline1 = $${paramIndex++}`); values.push(addressline1); }
    if (city !== undefined) { updates.push(`city = $${paramIndex++}`); values.push(city); }
    if (state !== undefined) { updates.push(`state = $${paramIndex++}`); values.push(state); }
    if (country !== undefined) { updates.push(`country = $${paramIndex++}`); values.push(country); }
    if (postalcode !== undefined) { updates.push(`postalcode = $${paramIndex++}`); values.push(postalcode); }
    if (taxid !== undefined) { updates.push(`taxid = $${paramIndex++}`); values.push(taxid); }
    if (licensenumber !== undefined) { updates.push(`licensenumber = $${paramIndex++}`); values.push(licensenumber); }
    if (paymentterms !== undefined) { updates.push(`paymentterms = $${paramIndex++}`); values.push(paymentterms); }
    if (creditlimit !== undefined) { updates.push(`creditlimit = $${paramIndex++}`); values.push(creditlimit); }
    if (currency !== undefined) { updates.push(`currency = $${paramIndex++}`); values.push(currency); }
    if (ispreferred !== undefined) { updates.push(`ispreferred = $${paramIndex++}`); values.push(ispreferred); }
    if (isactive !== undefined) { updates.push(`isactive = $${paramIndex++}`); values.push(isactive); }
    if (updatedby !== undefined) { updates.push(`updatedby = $${paramIndex++}`); values.push(updatedby); }

    values.push(supplierId);

    const sql = `
      UPDATE suppliers
      SET ${updates.join(', ')}
      WHERE supplierid = $${paramIndex}
      RETURNING *
    `;

    const result = await query(sql, values);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier updated successfully'
    });
    });
  } catch (error: any) {
    console.error('Update supplier error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

// DELETE - Delete supplier
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ supplierId: string }> }
) {
  try {
    const { supplierId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const result = await query('DELETE FROM suppliers WHERE supplierid = $1 AND workspaceid = $2 RETURNING *', [supplierId, workspaceId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier deleted successfully'
    });
    });
  } catch (error: any) {
    console.error('Delete supplier error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
