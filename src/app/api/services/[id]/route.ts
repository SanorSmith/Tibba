/**
 * /api/services/[id]
 * Single service from the real DB, plus revenue stats derived from invoices.
 */
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  try {
    const r = await pool.query(
      `SELECT id, code, name, name_ar, category, subcategory, description,
              price_self_pay, price_insurance, price_government, department_id,
              requires_appointment, duration_minutes, active,
              provider_id, provider_name, service_fee
       FROM services WHERE id::text = $1 OR code = $1 LIMIT 1`,
      [id]
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
}
