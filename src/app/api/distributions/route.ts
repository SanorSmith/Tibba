import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { getWorkspaceId } from '@/lib/workspace';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

/**
 * GET /api/distributions
 * Returns invoice_shares grouped by stakeholder with totals.
 * Query params: stakeholder_id, status, from, to
 */
export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const stakeholderId = searchParams.get('stakeholder_id');
    const status        = searchParams.get('status');
    const from          = searchParams.get('from');
    const to            = searchParams.get('to');
    const view          = searchParams.get('view') || 'summary'; // 'summary' | 'detail'

    if (view === 'detail') {
      // Return individual invoice_shares rows
      let q = `
        SELECT
          sh.id,
          sh.invoice_id,
          sh.invoice_item_id,
          sh.service_id,
          sh.stakeholder_id,
          sh.provider_role,
          sh.share_type,
          sh.share_percentage,
          sh.share_amount,
          sh.payment_status,
          sh.payment_date,
          sh.notes,
          sh.createdat,
          stk.name_ar   AS stakeholder_name,
          stk.role      AS stakeholder_role,
          i.invoice_number,
          i.invoice_date,
          p.firstname || ' ' || p.lastname AS patient_name
        FROM invoice_shares sh
        JOIN stakeholders stk ON sh.stakeholder_id = stk.id
        JOIN invoices i       ON sh.invoice_id = i.id
        LEFT JOIN patients p  ON i.patient_id::text = p.patientid::text
        WHERE sh.workspaceid = $1
      `;
      const params: any[] = [workspaceId];
      let idx = 2;
      if (stakeholderId) { q += ` AND sh.stakeholder_id = $${idx++}`; params.push(stakeholderId); }
      if (status)        { q += ` AND sh.payment_status = $${idx++}`; params.push(status); }
      if (from)          { q += ` AND i.invoice_date >= $${idx++}`;   params.push(from); }
      if (to)            { q += ` AND i.invoice_date <= $${idx++}`;   params.push(to); }
      q += ' ORDER BY sh.createdat DESC';

      const result = await pool.query(q, params);
      return NextResponse.json({ success: true, data: result.rows, count: result.rows.length });
    }

    // Default: summary grouped by stakeholder
    let q = `
      SELECT
        stk.id                                    AS stakeholder_id,
        stk.name_ar                               AS stakeholder_name,
        stk.name_en                               AS stakeholder_name_en,
        stk.role                                  AS stakeholder_role,
        stk.mobile,
        stk.bank_name_ar,
        stk.account_number,
        COUNT(sh.id)                              AS shares_count,
        COALESCE(SUM(sh.share_amount), 0)         AS total_amount,
        COALESCE(SUM(sh.share_amount) FILTER (WHERE sh.payment_status = 'PENDING'), 0)  AS pending_amount,
        COALESCE(SUM(sh.share_amount) FILTER (WHERE sh.payment_status = 'PAID'), 0)     AS paid_amount,
        COUNT(*) FILTER (WHERE sh.payment_status = 'PENDING')  AS pending_count,
        COUNT(*) FILTER (WHERE sh.payment_status = 'PAID')     AS paid_count
      FROM stakeholders stk
      JOIN invoice_shares sh ON stk.id = sh.stakeholder_id
      JOIN invoices i        ON sh.invoice_id = i.id
      WHERE sh.workspaceid = $1
    `;
    const params: any[] = [workspaceId];
    let idx = 2;
    if (stakeholderId) { q += ` AND stk.id = $${idx++}`; params.push(stakeholderId); }
    if (status)        { q += ` AND sh.payment_status = $${idx++}`; params.push(status); }
    if (from)          { q += ` AND i.invoice_date >= $${idx++}`;   params.push(from); }
    if (to)            { q += ` AND i.invoice_date <= $${idx++}`;   params.push(to); }
    q += ' GROUP BY stk.id, stk.name_ar, stk.name_en, stk.role, stk.mobile, stk.bank_name_ar, stk.account_number ORDER BY pending_amount DESC';

    const result = await pool.query(q, params);

    // Overall totals
    const totalPending = result.rows.reduce((s: number, r: any) => s + parseFloat(r.pending_amount), 0);
    const totalPaid    = result.rows.reduce((s: number, r: any) => s + parseFloat(r.paid_amount), 0);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      totals: { pending: totalPending, paid: totalPaid, total: totalPending + totalPaid },
    });
  } catch (error) {
    console.error('[distributions GET]', error);
    return NextResponse.json({ error: 'Failed to fetch distributions', detail: (error as Error).message }, { status: 500 });
  }
}
