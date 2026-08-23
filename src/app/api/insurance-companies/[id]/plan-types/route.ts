import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';



async function ensureTable() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS insurance_company_plan_types (
      id SERIAL PRIMARY KEY,
      company_id VARCHAR(50) NOT NULL,
      plan_name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// GET /api/insurance-companies/[id]/plan-types — list plans for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    const { id: companyId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

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
      `SELECT id, company_id, plan_name, created_at
       FROM insurance_company_plan_types
       WHERE company_id = $1
       ORDER BY plan_name`,
      [companyId]
    );

    return NextResponse.json({ success: true, data: result.rows });
    });
  } catch (error) {
    console.error('Error fetching insurance plan types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan types', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/insurance-companies/[id]/plan-types — add a plan name for a company
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    const { id: companyId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

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
    const { plan_name } = body;

    if (!plan_name || plan_name.trim() === '') {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }

    await ensureTable();

    const existing = await pool.query(
      `SELECT id FROM insurance_company_plan_types WHERE company_id = $1 AND LOWER(plan_name) = LOWER($2)`,
      [companyId, plan_name.trim()]
    );
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'A plan with this name already exists for this company' }, { status: 409 });
    }

    const result = await pool.query(
      `INSERT INTO insurance_company_plan_types (company_id, plan_name)
       VALUES ($1, $2)
       RETURNING *`,
      [companyId, plan_name.trim()]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
    });
  } catch (error) {
    console.error('Error creating insurance plan type:', error);
    return NextResponse.json(
      { error: 'Failed to create plan type', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/insurance-companies/[id]/plan-types?planId=123
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    const { id: companyId } = await params;
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

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
    const planId = searchParams.get('planId');

    if (!planId) {
      return NextResponse.json({ error: 'planId query parameter is required' }, { status: 400 });
    }

    await ensureTable();

    const result = await pool.query(
      `DELETE FROM insurance_company_plan_types WHERE id = $1 AND company_id = $2 RETURNING id`,
      [planId, companyId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Plan type not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Plan type deleted' });
    });
  } catch (error) {
    console.error('Error deleting insurance plan type:', error);
    return NextResponse.json(
      { error: 'Failed to delete plan type', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
