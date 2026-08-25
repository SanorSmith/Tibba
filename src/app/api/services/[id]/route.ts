/**
 * /api/services/[id]
 * Single service CRUD from the real DB, plus revenue stats derived from invoices.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  // Scoped to the caller's facility — another hospital's service must read
  // as "not found".
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  try {
    const r = await pool.query(
      `SELECT id, code, name, name_ar, category, subcategory, description,
              price_self_pay, price_insurance, price_government, department_id,
              requires_appointment, duration_minutes, active,
              provider_id, provider_name, service_fee
       FROM services WHERE (id::text = $1 OR code = $1) AND workspaceid = $2 LIMIT 1`,
      [id, workspaceId]
    );
    if (r.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }
    const service = r.rows[0];

    // Real revenue stats: how much this service has been invoiced + provider shares
    const stats = await pool.query(
      `SELECT
         COALESCE(SUM(ii.total_price), 0)                                   AS total_billed,
         COUNT(DISTINCT ii.invoice_id)                                      AS invoice_count,
         COALESCE((SELECT SUM(sh.share_amount) FROM invoice_shares sh
                   WHERE sh.service_id::text = $1), 0)                       AS provider_share_total,
         COALESCE((SELECT SUM(sh.share_amount) FROM invoice_shares sh
                   WHERE sh.service_id::text = $1 AND sh.payment_status='PAID'), 0) AS provider_share_paid
       FROM invoice_items ii
       WHERE ii.service_id::text = $1 OR ii.service_id = $2`,
      [service.id, service.code]
    );

    // Configured providers for this service
    const providers = await pool.query(
      `SELECT ss.provider_role, ss.share_type, ss.share_percentage,
              s.name_en AS stakeholder_name, s.name_ar AS stakeholder_name_ar
       FROM service_stakeholders ss
       JOIN stakeholders s ON s.id = ss.stakeholder_id
       WHERE ss.service_id = $1 AND ss.is_active = true
       ORDER BY ss.share_percentage DESC NULLS LAST`,
      [service.id]
    ).catch(() => ({ rows: [] }));

    return NextResponse.json({
      success: true,
      data: service,
      stats: stats.rows[0],
      providers: providers.rows,
    });
  } catch (error) {
    console.error('[services/[id] GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  // Scoped to the caller's facility — another hospital's service must read
  // as "not found".
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  try {
    const body = await req.json();
    const {
      name, name_ar, code, category, subcategory, description,
      price_self_pay, price_insurance, price_government,
      department_id, requires_appointment, duration_minutes,
      provider_id, provider_name, service_fee, active
    } = body;

    const result = await pool.query(
      `UPDATE services SET
        name = COALESCE($1, name),
        name_ar = COALESCE($2, name_ar),
        code = COALESCE($3, code),
        category = COALESCE($4, category),
        subcategory = COALESCE($5, subcategory),
        description = COALESCE($6, description),
        price_self_pay = COALESCE($7, price_self_pay),
        price_insurance = COALESCE($8, price_insurance),
        price_government = COALESCE($9, price_government),
        department_id = COALESCE($10, department_id),
        requires_appointment = COALESCE($11, requires_appointment),
        duration_minutes = COALESCE($12, duration_minutes),
        provider_id = COALESCE($13, provider_id),
        provider_name = COALESCE($14, provider_name),
        service_fee = COALESCE($15, service_fee),
        active = COALESCE($16, active),
        updatedat = NOW()
      WHERE (id::text = $17 OR code = $17) AND workspaceid = $18
      RETURNING *`,
      [
        name || null, name_ar || null, code || null, category || null,
        subcategory || null, description || null,
        price_self_pay ?? null, price_insurance ?? null, price_government ?? null,
        department_id || null, requires_appointment ?? null, duration_minutes ?? null,
        provider_id || null, provider_name || null, service_fee ?? null,
        active ?? null, id, workspaceId
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[services/[id] PUT]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  // Scoped to the caller's facility — another hospital's service must read
  // as "not found".
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  try {
    // Soft-delete: set active = false
    const result = await pool.query(
      `UPDATE services SET active = false, updatedat = NOW()
       WHERE (id::text = $1 OR code = $1) AND workspaceid = $2
       RETURNING id, code, name`,
      [id, workspaceId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Service deactivated', data: result.rows[0] });
  } catch (error) {
    console.error('[services/[id] DELETE]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}
