/**
 * GET /api/shareholders/distributable
 * Computes how much profit is legitimately available to distribute as dividends,
 * sourced from the General Ledger:
 *
 *   Available = Current-Year Net Income (Revenue − Expenses)
 *             + Retained Earnings balance (already net of prior dividends)
 *
 * Owner's Capital (paid-in) is deliberately EXCLUDED — you cannot pay dividends
 * out of capital. If the result is negative, nothing is available.
 */
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

export async function GET() {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    // Revenue (credit-normal) and Expenses (debit-normal) from posted GL
    const pl = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN a.accounttype='REVENUE' THEN l.credit - l.debit END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN a.accounttype='EXPENSE' THEN l.debit  - l.credit END), 0) AS expenses
      FROM fin_journal_lines l
      JOIN fin_journal_entries je ON l.journalid = je.journalid
      JOIN fin_accounts a ON l.accountid = a.accountid
      WHERE je.status = 'POSTED'
    `);
    const revenue   = parseFloat(pl.rows[0].revenue) || 0;
    const expenses  = parseFloat(pl.rows[0].expenses) || 0;
    const netIncome = revenue - expenses;

    // Retained Earnings GL balance (credit-normal). Already reflects prior dividends.
    const re = await pool.query(`
      SELECT COALESCE(SUM(l.credit - l.debit), 0) AS bal
      FROM fin_journal_lines l
      JOIN fin_journal_entries je ON l.journalid = je.journalid
      JOIN fin_accounts a ON l.accountid = a.accountid
      WHERE je.status = 'POSTED'
        AND (a.accountcode = '3200' OR LOWER(a.accountname) LIKE '%retained%')
    `);
    const retainedEarnings = parseFloat(re.rows[0].bal) || 0;

    // Total dividends already declared (for reference)
    let dividendsDeclared = 0;
    try {
      const d = await pool.query(`SELECT COALESCE(SUM(amount),0) AS t FROM shareholder_distributions`);
      dividendsDeclared = parseFloat(d.rows[0].t) || 0;
    } catch { /* table may not exist yet */ }

    const availableRaw = netIncome + retainedEarnings;
    const available = Math.max(0, Math.round(availableRaw));

    return NextResponse.json({
      success: true,
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
      net_income: Math.round(netIncome),
      retained_earnings: Math.round(retainedEarnings),
      dividends_declared: Math.round(dividendsDeclared),
      available_to_distribute: available,
      available_raw: Math.round(availableRaw),     // may be negative
      has_profit: availableRaw > 0,
    });
  } catch (error) {
    console.error('[shareholders/distributable]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
