/**
 * /api/reports/cash-flow
 * Cash Flow Statement from real GL postings to the Cash & Bank account (1111).
 * Cash inflow  = DEBIT to cash; outflow = CREDIT to cash.
 * Classified into Operating / Investing / Financing by journal sourcetype.
 * Query params: ?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults: current year).
 */
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

const CASH_CODE = '1111';

// Map GL sourcetype → cash-flow activity + a human label
function classify(sourcetype: string): { activity: 'operating' | 'investing' | 'financing'; label: string } {
  const s = (sourcetype || '').toUpperCase();
  if (s === 'SH_CAPITAL') return { activity: 'financing', label: 'Shareholder capital contributions' };
  if (s === 'DIVIDEND')   return { activity: 'financing', label: 'Dividend distributions' };
  if (s === 'LOAN')       return { activity: 'financing', label: 'Loan proceeds / repayments' };
  if (s.includes('ASSET') || s === 'INVENTORY') return { activity: 'investing', label: 'Asset / inventory purchases' };
  if (s === 'INVOICE' || s === 'PAYMENT')  return { activity: 'operating', label: 'Customer collections' };
  if (s === 'CLAIM')      return { activity: 'operating', label: 'Insurance claim collections' };
  if (s === 'AP_PAYMENT' || s === 'AP_INVOICE') return { activity: 'operating', label: 'Supplier payments' };
  if (s === 'PAYROLL')    return { activity: 'operating', label: 'Payroll & wages' };
  return { activity: 'operating', label: s ? `Other (${s})` : 'Other operating' };
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const { searchParams } = new URL(request.url);
    // The cash account is resolved per facility, so both the account lookup
    // and the journal entries are filtered.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    const year = new Date().getFullYear();
    const from = searchParams.get('from') || `${year}-01-01`;
    const to   = searchParams.get('to')   || `${year}-12-31`;

    // Opening cash balance = net cash movement strictly before `from`
    const openingRes = await pool.query(`
      SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS bal
      FROM fin_journal_lines jl
      JOIN fin_journal_entries je ON je.journalid = jl.journalid
      JOIN fin_accounts a ON a.accountid = jl.accountid
      WHERE a.accountcode = $1 AND je.journaldate < $2
        AND je.workspaceid = $3 AND a.workspaceid = $3
    `, [CASH_CODE, from, workspaceId]);
    const opening = parseFloat(openingRes.rows[0].bal) || 0;

    // Movements within the period, grouped by sourcetype
    const movRes = await pool.query(`
      SELECT je.sourcetype,
             SUM(jl.debit)  AS inflow,
             SUM(jl.credit) AS outflow
      FROM fin_journal_lines jl
      JOIN fin_journal_entries je ON je.journalid = jl.journalid
      JOIN fin_accounts a ON a.accountid = jl.accountid
      WHERE a.accountcode = $1 AND je.journaldate >= $2 AND je.journaldate <= $3
        AND je.workspaceid = $4 AND a.workspaceid = $4
      GROUP BY je.sourcetype
    `, [CASH_CODE, from, to, workspaceId]);

    const groups: Record<string, { activity: string; label: string; inflow: number; outflow: number; net: number }> = {};
    const subtotal = { operating: 0, investing: 0, financing: 0 };

    for (const row of movRes.rows) {
      const inflow = parseFloat(row.inflow) || 0;
      const outflow = parseFloat(row.outflow) || 0;
      const net = inflow - outflow;
      const { activity, label } = classify(row.sourcetype);
      const key = `${activity}::${label}`;
      if (!groups[key]) groups[key] = { activity, label, inflow: 0, outflow: 0, net: 0 };
      groups[key].inflow += inflow;
      groups[key].outflow += outflow;
      groups[key].net += net;
      subtotal[activity as keyof typeof subtotal] += net;
    }

    const lines = Object.values(groups);
    const netChange = subtotal.operating + subtotal.investing + subtotal.financing;
    const closing = opening + netChange;

    return NextResponse.json({
      success: true,
      from, to,
      opening_balance: opening,
      operating: { lines: lines.filter(l => l.activity === 'operating'), subtotal: subtotal.operating },
      investing: { lines: lines.filter(l => l.activity === 'investing'), subtotal: subtotal.investing },
      financing: { lines: lines.filter(l => l.activity === 'financing'), subtotal: subtotal.financing },
      net_change: netChange,
      closing_balance: closing,
    });
  } catch (error) {
    console.error('[cash-flow GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
