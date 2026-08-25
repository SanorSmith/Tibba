/**
 * POST /api/finance/gl-backfill-payroll
 * Posts payroll accrual (DR Salaries / CR Payables) for every calculated payroll
 * period that has no PAYROLL journal entry yet. Idempotent — clears+reposts so it
 * is safe to run multiple times.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { postPayroll } from '@/lib/gl-posting';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  // Backfill only the caller’s facility payroll, not every hospital’s.
  const ws = await getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(ws, async () => {

  // Periods that have payroll transactions
  const periods = await pool.query(`
    SELECT pp.id, pp.period_name,
           pp.end_date,
           COALESCE(SUM(pt.gross_salary), 0) AS gross,
           COALESCE(SUM(pt.net_salary), 0)   AS net,
           COALESCE(SUM(pt.income_tax), 0)   AS tax
    FROM payroll_periods pp
    JOIN payroll_transactions pt ON pt.period_id = pp.id
    WHERE pp.workspaceid = $1
    GROUP BY pp.id, pp.period_name, pp.end_date
    HAVING COALESCE(SUM(pt.gross_salary), 0) > 0
    ORDER BY pp.end_date ASC NULLS LAST
  `, [ws]);

  let posted = 0;
  const errors: string[] = [];

  for (const p of periods.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Clear any prior PAYROLL entry for this period (idempotent)
      await client.query(
        `DELETE FROM fin_journal_lines WHERE journalid IN (
           SELECT journalid FROM fin_journal_entries
           WHERE sourcetype='PAYROLL' AND sourceid=$1)`, [p.id]);
      await client.query(
        `DELETE FROM fin_journal_entries WHERE sourcetype='PAYROLL' AND sourceid=$1`, [p.id]);

      const entryDate = p.end_date
        ? new Date(p.end_date).toISOString().split('T')[0]
        : undefined;

      await postPayroll(client, ws, p.id, p.period_name || 'Period', {
        gross: parseFloat(p.gross) || 0,
        net: parseFloat(p.net) || 0,
        incomeTax: parseFloat(p.tax) || 0,
      }, entryDate);

      await client.query('COMMIT');
      posted++;
    } catch (err) {
      await client.query('ROLLBACK');
      errors.push(`${p.period_name}: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  return NextResponse.json({
    success: true,
    posted,
    errors,
    message: `Posted payroll GL entries for ${posted} period(s). ${errors.length} errors.`,
  });
  });
}
