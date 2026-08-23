/**
 * /api/reports/ap-aging
 * Accounts Payable aging — open supplier/vendor invoices bucketed by age.
 * Aging is measured against DUE DATE (true past-due), falling back to invoice_date.
 * Buckets: Not Due, 1-30, 31-60, 61-90, 90+ days overdue.
 * Source: ap_invoices (status NOT IN PAID/CANCELLED, balance_due > 0).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


function bucketOf(daysOverdue: number): string {
  if (daysOverdue <= 0) return 'not_due';
  if (daysOverdue <= 30) return 'd1_30';
  if (daysOverdue <= 60) return 'd31_60';
  if (daysOverdue <= 90) return 'd61_90';
  return 'd90_plus';
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const workspaceId = await getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const asOf = searchParams.get('as_of') || new Date().toISOString().slice(0, 10);
    const r = await pool.query(`
      SELECT
        ap_number,
        vendor_name,
        invoice_date,
        due_date,
        status,
        COALESCE(balance_due, 0) AS balance_due,
        ($1::date - COALESCE(due_date, invoice_date)::date) AS days_overdue
      FROM ap_invoices
      WHERE workspaceid = $2
        AND COALESCE(status,'') NOT IN ('PAID','CANCELLED')
        AND COALESCE(balance_due, 0) > 0
        AND invoice_date::date <= $1::date
      ORDER BY COALESCE(due_date, invoice_date) ASC
    `, [asOf, workspaceId]);

    const emptyBuckets = (): Record<string, number> => ({ not_due: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 });
    const totals = emptyBuckets();
    const byVendor: Record<string, any> = {};
    const rows: any[] = [];

    for (const ap of r.rows) {
      const bal = parseFloat(ap.balance_due) || 0;
      const overdue = parseInt(ap.days_overdue, 10) || 0;
      const bucket = bucketOf(overdue);

      const name = ap.vendor_name || 'Unknown Vendor';
      if (!byVendor[name]) byVendor[name] = { vendor_name: name, ...emptyBuckets() };
      byVendor[name][bucket] += bal;
      byVendor[name].total += bal;

      totals[bucket] += bal;
      totals.total += bal;

      rows.push({
        ap_number: ap.ap_number,
        vendor_name: name,
        invoice_date: ap.invoice_date,
        due_date: ap.due_date,
        status: ap.status,
        days_overdue: overdue,
        bucket,
        balance_due: bal,
      });
    }

    return NextResponse.json({
      success: true,
      as_of: asOf,
      totals,
      by_vendor: Object.values(byVendor).sort((a: any, b: any) => b.total - a.total),
      invoices: rows,
    });
    });
  } catch (error) {
    console.error('[ap-aging GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
