/**
 * POST /api/finance/gl-backfill-payroll
 * Posts payroll accrual (DR Salaries / CR Payables) for every calculated payroll
 * period that has no PAYROLL journal entry yet. Idempotent — clears+reposts so it
 * is safe to run multiple times.
 */
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { postPayroll } from '@/lib/gl-posting';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

export async function POST() {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  // Periods that have payroll transactions
  const periods = await pool.query(`
    SELECT pp.id, pp.period_name,
           pp.end_date,
           COALESCE(SUM(pt.gross_salary), 0) AS gross,
           COALESCE(SUM(pt.net_salary), 0)   AS net,
           COALESCE(SUM(pt.income_tax), 0)   AS tax
    FROM payroll_periods pp
    JOIN payroll_transactions pt ON pt.period_id = pp.id
    GROUP BY pp.id, pp.period_name, pp.end_date
    HAVING COALESCE(SUM(pt.gross_salary), 0) > 0
    ORDER BY pp.end_date ASC NULLS LAST
  `);

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

      await postPayroll(client, p.id, p.period_name || 'Period', {
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
}
