import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

/**
 * GET /api/finance/accounts
 * Returns chart of accounts from fin_accounts joined with latest balances.
 */
export async function GET(_request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    // Optional period filtering on the journal-line balance computation.
    //   ?to=YYYY-MM-DD   → cumulative balance up to a date (Balance Sheet / Trial "as of")
    //   ?from=YYYY-MM-DD → lower bound (combined with `to` gives period activity, for Income Statement)
    const { searchParams } = new URL(_request.url);
    const from = searchParams.get('from');
    const to   = searchParams.get('to');
    const params: any[] = [];
    let dateFilter = '';
    if (from) { params.push(from); dateFilter += ` AND je.journaldate >= $${params.length}`; }
    if (to)   { params.push(to);   dateFilter += ` AND je.journaldate <= $${params.length}`; }

    const result = await pool.query(`
      SELECT
        a.accountid           AS account_id,
        a.accountcode         AS account_number,
        a.accountname         AS account_name,
        a.accountname         AS account_name_ar,
        a.accounttype         AS account_type,
        a.accountsubtype      AS account_subtype,
        a.parentaccountid     AS parent_account_id,
        a.level,
        a.isgroupaccount      AS is_group,
        NOT a.isgroupaccount  AS allow_posting,
        a.isactive            AS is_active,
        a.normalbalance       AS normal_balance,
        a.description,
        -- Compute balance from journal lines (POSTED entries only)
        -- For DEBIT-normal accounts: balance = total_debit - total_credit (positive = asset/expense)
        -- For CREDIT-normal accounts: balance = total_credit - total_debit (positive = liability/equity/revenue)
        COALESCE(
          (SELECT
             CASE WHEN a.normalbalance = 'DEBIT'
               THEN SUM(jl.debit) - SUM(jl.credit)
               ELSE SUM(jl.credit) - SUM(jl.debit)
             END
           FROM fin_journal_lines jl
           JOIN fin_journal_entries je ON jl.journalid = je.journalid
           WHERE jl.accountid = a.accountid
             AND je.status = 'POSTED'${dateFilter}),
          0
        ) AS balance
      FROM fin_accounts a
      ORDER BY a.accountcode
    `, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('[finance/accounts GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts', detail: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/finance/accounts
 * Creates a new account in fin_accounts.
 */
export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const {
      account_code,
      account_name,
      account_type,
      account_subtype,
      parent_account_id,
      normal_balance,
      is_group = false,
      description,
      workspace_id = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd', // default workspace
    } = body;

    if (!account_code || !account_name || !account_type) {
      return NextResponse.json(
        { error: 'account_code, account_name, and account_type are required' },
        { status: 400 }
      );
    }

    // Determine level from parent
    let level = 1;
    if (parent_account_id) {
      const parent = await pool.query(
        'SELECT level FROM fin_accounts WHERE accountid = $1',
        [parent_account_id]
      );
      if (parent.rows.length > 0) level = (parent.rows[0].level || 1) + 1;
    }

    const result = await pool.query(
      `INSERT INTO fin_accounts (
         workspaceid, accountcode, accountname, accounttype, accountsubtype,
         parentaccountid, level, isgroupaccount, isactive, normalbalance, description,
         createdat, updatedat
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$10,NOW(),NOW())
       RETURNING *`,
      [
        workspace_id,
        account_code,
        account_name,
        account_type,
        account_subtype || null,
        parent_account_id || null,
        level,
        is_group,
        normal_balance || (account_type === 'ASSET' || account_type === 'EXPENSE' ? 'DEBIT' : 'CREDIT'),
        description || null,
      ]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[finance/accounts POST] error:', error);
    return NextResponse.json(
      { error: 'Failed to create account', detail: (error as Error).message },
      { status: 500 }
    );
  }
}
