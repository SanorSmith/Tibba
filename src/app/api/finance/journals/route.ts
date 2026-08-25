import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export const dynamic = 'force-dynamic';


/**
 * GET /api/finance/journals
 * Returns journal entries with their lines from fin_journal_entries + fin_journal_lines.
 * Query params: status, from, to, source_type
 */
export async function GET(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

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
    const status     = searchParams.get('status');
    const from       = searchParams.get('from');
    const to         = searchParams.get('to');
    const sourceType = searchParams.get('source_type');

    let query = `
      SELECT
        je.journalid      AS entry_id,
        je.journalnumber  AS entry_number,
        je.journaldate    AS entry_date,
        je.sourcetype     AS entry_type,
        je.description    AS description_ar,
        je.totaldebit     AS total_debits,
        je.totalcredit    AS total_credits,
        je.status,
        je.status = 'POSTED' AS posted,
        je.createdat
      FROM fin_journal_entries je
      WHERE je.workspaceid = $1
    `;

    const params: any[] = [workspaceId];
    let idx = 2;

    if (status)     { query += ` AND je.status = $${idx++}`;                params.push(status); }
    if (sourceType) { query += ` AND je.sourcetype = $${idx++}`;            params.push(sourceType); }
    if (from)       { query += ` AND je.journaldate >= $${idx++}`;          params.push(from); }
    if (to)         { query += ` AND je.journaldate <= $${idx++}`;          params.push(to); }

    query += ` ORDER BY je.journaldate DESC, je.createdat DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
    });
  } catch (error) {
    console.error('[finance/journals GET] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entries', detail: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/finance/journals/[id]/lines — handled via a separate route.
 * For now, GET with ?entry_id=xxx returns lines for that entry.
 */

/**
 * POST /api/finance/journals
 * Creates a new journal entry with lines.
 * Body: { description, entry_date, lines: [{ account_id, debit, credit, memo }] }
 */
export async function POST(request: NextRequest) {
  if (!pool) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      description,
      entry_date,
      source_type = 'MANUAL',
      lines = [],
    } = body;

    // Journal entries post to the caller's facility ledger, never one named
    // by the client.
    const workspace_id = await getWorkspaceId(request);
    if (!workspace_id) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }

    // Carries this facility on the connection, so row-level security
    // scopes every query below in the database rather than relying on
    // each one remembering its WHERE clause.
    return await withTenant(workspace_id, async () => {

    if (!description || !entry_date || lines.length < 2) {
      return NextResponse.json(
        { error: 'description, entry_date, and at least 2 lines are required' },
        { status: 400 }
      );
    }

    const totalDebit  = lines.reduce((s: number, l: any) => s + (parseFloat(l.debit)  || 0), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Journal entry must balance: debits (${totalDebit}) ≠ credits (${totalCredit})` },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Generate journal number
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const journalNumber = `JE-${year}-${rand}`;

    // Insert header
    const jeResult = await client.query(
      `INSERT INTO fin_journal_entries (
         workspaceid, journalnumber, journaldate, sourcetype,
         description, totaldebit, totalcredit, status, createdat, updatedat
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'DRAFT',NOW(),NOW())
       RETURNING *`,
      [workspace_id, journalNumber, entry_date, source_type, description, totalDebit, totalCredit]
    );
    const je = jeResult.rows[0];

    // Insert lines
    for (const line of lines) {
      await client.query(
        `INSERT INTO fin_journal_lines (journalid, accountid, debit, credit, memo)
         VALUES ($1, $2, $3, $4, $5)`,
        [je.journalid, line.account_id, parseFloat(line.debit) || 0, parseFloat(line.credit) || 0, line.memo || null]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, data: je }, { status: 201 });
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[finance/journals POST] error:', error);
    return NextResponse.json(
      { error: 'Failed to create journal entry', detail: (error as Error).message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
