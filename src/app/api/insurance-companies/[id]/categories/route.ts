import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';
import { ensureSchema } from '@/lib/db/ensure-schema';

export const dynamic = 'force-dynamic';



async function ensureTable() {
  if (!pool) return;
  await ensureSchema(`
    CREATE TABLE IF NOT EXISTS insurance_company_categories (
      id SERIAL PRIMARY KEY,
      company_id VARCHAR(50) NOT NULL,
      category_name VARCHAR(255) NOT NULL,
      coverage_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!pool) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { id: companyId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    // The company must belong to this facility before its list is read or
    // changed — company_id alone came straight from the URL.
    const owns = await pool.query(
      'SELECT 1 FROM insurance_companies WHERE company_id = $1 AND workspaceid = $2',
      [companyId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ error: 'Insurance company not found' }, { status: 404 });
    }
    await ensureTable();

    const result = await pool.query(
      `SELECT id, company_id, category_name, coverage_percentage, created_at, updated_at
       FROM insurance_company_categories
       WHERE company_id = $1
       ORDER BY category_name`,
      [companyId]
    );

    return NextResponse.json({ success: true, data: result.rows });
    });
  } catch (error) {
    console.error('Error fetching insurance categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!pool) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { id: companyId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    // The company must belong to this facility before its list is read or
    // changed — company_id alone came straight from the URL.
    const owns = await pool.query(
      'SELECT 1 FROM insurance_companies WHERE company_id = $1 AND workspaceid = $2',
      [companyId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ error: 'Insurance company not found' }, { status: 404 });
    }
    const body = await request.json();
    const { category_name, coverage_percentage } = body;

    if (!category_name || category_name.trim() === '') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    if (coverage_percentage == null || coverage_percentage < 0 || coverage_percentage > 100) {
      return NextResponse.json({ error: 'Coverage percentage must be between 0 and 100' }, { status: 400 });
    }

    await ensureTable();

    // Check for duplicate category name for this company
    const existing = await pool.query(
      `SELECT id FROM insurance_company_categories WHERE company_id = $1 AND LOWER(category_name) = LOWER($2)`,
      [companyId, category_name.trim()]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'A category with this name already exists for this company' }, { status: 409 });
    }

    const result = await pool.query(
      `INSERT INTO insurance_company_categories (company_id, category_name, coverage_percentage)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [companyId, category_name.trim(), coverage_percentage]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
    });
  } catch (error) {
    console.error('Error creating insurance category:', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!pool) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { id: companyId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspaceId, async () => {

    // The company must belong to this facility before its list is read or
    // changed — company_id alone came straight from the URL.
    const owns = await pool.query(
      'SELECT 1 FROM insurance_companies WHERE company_id = $1 AND workspaceid = $2',
      [companyId, workspaceId]
    );
    if (owns.rows.length === 0) {
      return NextResponse.json({ error: 'Insurance company not found' }, { status: 404 });
    }
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId query parameter is required' }, { status: 400 });
    }

    await ensureTable();

    const result = await pool.query(
      `DELETE FROM insurance_company_categories WHERE id = $1 AND company_id = $2 RETURNING id`,
      [categoryId, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Category deleted' });
    });
  } catch (error) {
    console.error('Error deleting insurance category:', error);
    return NextResponse.json(
      { error: 'Failed to delete category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
