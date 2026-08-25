/**
 * GET /api/shareholders/[id]/statement
 * A shareholder "account statement": equity stake, paid-in capital, dividend
 * history, total received, and current ownership value.
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
  const workspaceId = await getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return await withTenant(workspaceId, async () => {
  try {
    const shRes = await pool.query('SELECT * FROM shareholders WHERE id = $1 AND workspaceid = $2', [id, workspaceId]);
    if (shRes.rows.length === 0) {
      return NextResponse.json({ error: 'Shareholder not found' }, { status: 404 });
    }
    const sh = shRes.rows[0];

    // Dividend history for this shareholder
    let dividends: any[] = [];
    try {
      const dRes = await pool.query(
        `SELECT declaration_number, dividend_date, total_declared, share_percentage, amount, status
         FROM shareholder_distributions
         WHERE shareholder_id = $1 AND workspaceid = $2
         ORDER BY dividend_date DESC`,
        [id, workspaceId]
      );
      dividends = dRes.rows;
    } catch { /* table may not exist yet */ }

    const sharePct        = parseFloat(sh.share_percentage) || 0;
    const paidInCapital   = parseFloat(sh.investment_amount) || 0;
    const totalDividends  = dividends.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0);

    // Company-wide totals for ownership-value context
    const totals = await pool.query(
      `SELECT COALESCE(SUM(investment_amount),0) AS total_capital,
              COALESCE(SUM(number_of_shares),0)  AS total_shares
       FROM shareholders WHERE status = 'ACTIVE' AND workspaceid = $1`,
      [workspaceId]
    );
    const companyCapital = parseFloat(totals.rows[0].total_capital) || 0;
    const ownershipValue = Math.round((companyCapital * sharePct) / 100);

    return NextResponse.json({
      success: true,
      shareholder: {
        id: sh.id,
        code: sh.shareholder_id,
        name: sh.full_name,
        type: sh.shareholder_type,
        status: sh.status,
        is_board_member: sh.is_board_member,
        board_position: sh.board_position,
      },
      account: {
        share_percentage: sharePct,
        number_of_shares: parseFloat(sh.number_of_shares) || 0,
        paid_in_capital: paidInCapital,
        ownership_value: ownershipValue,        // pct of company capital
        total_dividends_received: totalDividends || (parseFloat(sh.total_dividends_received) || 0),
        last_dividend_date: sh.last_dividend_date,
        total_return: (totalDividends || 0),    // cash returned to date
      },
      dividend_history: dividends,
    });
  } catch (error) {
    console.error('[shareholder statement GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
  });
}
