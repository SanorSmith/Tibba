/**
 * GET /api/ap-invoices/[id]/journals
 * Returns the GL journal entries linked to an AP invoice, matched by the AP number
 * embedded in the journal description (e.g. "... (AP-2026-45148 · ORD-...)").
 * Includes each entry's debit/credit lines with account names.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const { id } = await params;
  const workspaceId = getWorkspaceId(req);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    // Resolve the AP number for this invoice
    const apRes = await pool.query(
      `SELECT ap_number FROM ap_invoices WHERE id = $1 AND workspaceid = $2`,
      [id, workspaceId]
    );
    if (apRes.rows.length === 0) {
      return NextResponse.json({ error: 'AP invoice not found' }, { status: 404 });
    }
    const apNumber = apRes.rows[0].ap_number;

    // Match by sourceid (reliable, new entries) OR description text (legacy entries)
    const jeRes = await pool.query(
      `SELECT journalid, journalnumber, journaldate, sourcetype, description,
              totaldebit, totalcredit, status
       FROM fin_journal_entries
       WHERE workspaceid = $3
         AND (sourceid = $1
              OR ($2 <> '' AND description LIKE '%' || $2 || '%'))
       ORDER BY createdat ASC`,
      [id, apNumber, workspaceId]
    );

    // Attach lines (with account names) to each entry
    const entries = [];
    for (const je of jeRes.rows) {
      const lines = await pool.query(
        `SELECT a.accountcode, a.accountname, l.debit, l.credit, l.memo
         FROM fin_journal_lines l
         JOIN fin_accounts a ON l.accountid = a.accountid
         WHERE l.journalid = $1
         ORDER BY l.debit DESC`,
        [je.journalid]
      );
      entries.push({ ...je, lines: lines.rows });
    }

    return NextResponse.json({
      success: true,
      ap_number: apNumber,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    console.error('[ap-invoices/journals GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
