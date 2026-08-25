/**
 * /api/reports/ar-aging
 * Accounts Receivable aging — open customer invoices bucketed by age.
 * Buckets: Current, 1-30, 31-60, 61-90, 90+ days (from invoice_date).
 * Source: invoices table (status NOT IN PAID/CANCELLED, balance_due > 0).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


function bucketOf(days: number): string {
  if (days <= 0) return 'current';
  if (days <= 30) return 'd1_30';
  if (days <= 60) return 'd31_60';
  if (days <= 90) return 'd61_90';
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
    return await withTenant(workspaceId, async () => {

    const { searchParams } = new URL(request.url);
    const asOf = searchParams.get('as_of') || new Date().toISOString().slice(0, 10);
    const r = await pool.query(`
      SELECT
        invoice_number,
        patient_name,
        invoice_date,
        status,
        COALESCE(balance_due, 0) AS balance_due,
        GREATEST(0, ($1::date - invoice_date::date)) AS age_days
      FROM invoices
      WHERE workspaceid = $2
        AND status NOT IN ('PAID','CANCELLED')
        AND COALESCE(balance_due, 0) > 0
        AND invoice_date::date <= $1::date
      ORDER BY invoice_date ASC
    `, [asOf, workspaceId]);

    const emptyBuckets = (): Record<string, number> => ({ current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 });
    const totals = emptyBuckets();
    const byPatient: Record<string, any> = {};
    const rows: any[] = [];

    for (const inv of r.rows) {
      const bal = parseFloat(inv.balance_due) || 0;
      const age = parseInt(inv.age_days, 10) || 0;
      const bucket = bucketOf(age);

      const name = inv.patient_name || 'Unknown';
      if (!byPatient[name]) byPatient[name] = { patient_name: name, ...emptyBuckets() };
      byPatient[name][bucket] += bal;
      byPatient[name].total += bal;

      totals[bucket] += bal;
      totals.total += bal;

      rows.push({
        invoice_number: inv.invoice_number,
        patient_name: name,
        invoice_date: inv.invoice_date,
        status: inv.status,
        age_days: age,
        bucket,
        balance_due: bal,
      });
    }

    return NextResponse.json({
      success: true,
      as_of: asOf,
      totals,
      by_patient: Object.values(byPatient).sort((a: any, b: any) => b.total - a.total),
      invoices: rows,
    });
    });
  } catch (error) {
    console.error('[ar-aging GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
