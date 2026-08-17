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
 * GET /api/finance/journals/[id]
 * Returns a single journal entry with its lines.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const jeResult = await pool.query(
      `SELECT
         je.journalid      AS entry_id,
         je.journalnumber  AS entry_number,
         je.journaldate    AS entry_date,
         je.sourcetype     AS entry_type,
         je.description    AS description_ar,
         je.totaldebit     AS total_debits,
         je.totalcredit    AS total_credits,
         je.status,
         je.status = 'POSTED' AS posted
       FROM fin_journal_entries je
       WHERE je.journalid = $1 AND je.workspaceid = $2`,
      [id, workspaceId]
    );
    if (jeResult.rows.length === 0) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 });
    }

    // Fetch lines with account details
    const linesResult = await pool.query(
      `SELECT
         l.lineid          AS line_id,
         l.accountid       AS account_id,
         a.accountcode     AS account_number,
         a.accountname     AS account_name_ar,
         l.debit           AS debit_amount,
         l.credit          AS credit_amount,
         l.memo            AS line_description_ar
       FROM fin_journal_lines l
       LEFT JOIN fin_accounts a ON l.accountid = a.accountid
       WHERE l.journalid = $1
       ORDER BY l.debit DESC, l.credit DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: { ...jeResult.rows[0], lines: linesResult.rows },
    });
  } catch (error) {
    console.error('[finance/journals/[id] GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entry', detail: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/finance/journals/[id]
 * Supports action: 'post' to post a DRAFT entry.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!pool) return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  const { id } = await params;

  try {
    // Posting an entry commits it to a facility's ledger.
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    const body = await request.json();
    const { action, posted_by } = body;

    if (action === 'post') {
      const result = await pool.query(
        `UPDATE fin_journal_entries
         SET status = 'POSTED', postedby = $1, postedat = NOW(), updatedat = NOW()
         WHERE journalid = $2 AND status = 'DRAFT' AND workspaceid = $3
         RETURNING *`,
        [posted_by || null, id, workspaceId]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Entry not found or already posted' }, { status: 400 });
      }
      return NextResponse.json({ success: true, data: result.rows[0] });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[finance/journals/[id] PUT] error:', error);
    return NextResponse.json(
      { error: 'Failed to update journal entry', detail: (error as Error).message },
      { status: 500 }
    );
  }
}
