import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

// GET - List suppliers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('isActive');

    // Supplier list is facility-private. The workspace came from a query
    // param before, so omitting it listed every facility's suppliers.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    let sql = 'SELECT * FROM suppliers WHERE workspaceid = $1';
    const params: any[] = [workspaceId];
    let paramIndex = 2;

    if (category && category !== 'ALL') {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    if (isActive !== null) {
      sql += ` AND isactive = $${paramIndex++}`;
      params.push(isActive === 'true');
    }

    sql += ' ORDER BY createdat DESC';

    const result = await query(sql, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error: any) {
    console.error('Get suppliers error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}

// POST - Create supplier
export async function POST(request: NextRequest) {
  try {
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
      createdby,
    } = body;

    // New suppliers belong to the creator's facility, not one the client picks.
    const workspaceid = getWorkspaceId(request);
    if (!workspaceid) {
      return NextResponse.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }

    // Generate code if not provided
    const supplierCode = code || `SUP-${Date.now().toString().slice(-6)}`;

    const result = await query(`
      INSERT INTO suppliers (
        supplierid, code, name, category, type, phonenumber, email,
        contactperson, addressline1, city, state, country, postalcode,
        taxid, licensenumber, paymentterms, creditlimit, currency,
        ispreferred, isactive, workspaceid, createdby, createdat
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17,
        $18, $19, $20, $21, NOW()
      ) RETURNING *
    `, [
      supplierCode,
      name,
      category || 'general',
      type || 'vendor',
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
      currency || 'USD',
      ispreferred || false,
      isactive !== undefined ? isactive : true,
      workspaceid,
      createdby || 'af41447e-91c1-45e5-91c4-a2c5bf3cb9ce',
    ]);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Supplier created successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create supplier error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create supplier' },
      { status: 500 }
    );
  }
}
