/**
 * POST /api/shareholders/capital-backfill
 * Posts each active shareholder's paid-in capital to the GL
 * (DR Cash / CR Owner's Capital), so the Balance Sheet equity reflects real
 * shareholder investment. Idempotent — clears + reposts per shareholder.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { postShareholderCapital } from '@/lib/gl-posting';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  // Shareholders are per-facility; post only the caller’s.
  const ws = getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const sh = await pool.query(
    `SELECT id, shareholder_id, full_name, COALESCE(investment_amount,0) AS amount
     FROM shareholders
     WHERE workspaceid = $1 AND status = 'ACTIVE' AND COALESCE(investment_amount,0) > 0`,
    [ws]
  );

  let posted = 0;
  const errors: string[] = [];

  for (const s of sh.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Idempotent: remove prior capital entry for this shareholder
      await client.query(
        `DELETE FROM fin_journal_lines WHERE journalid IN (
           SELECT journalid FROM fin_journal_entries
           WHERE sourcetype='SH_CAPITAL' AND sourceid=$1)`, [s.id]);
      await client.query(
        `DELETE FROM fin_journal_entries WHERE sourcetype='SH_CAPITAL' AND sourceid=$1`, [s.id]);

      await postShareholderCapital(
        client,
        ws, s.id, `${s.full_name} (${s.shareholder_id})`, parseFloat(s.amount) || 0
      );
      await client.query('COMMIT');
      posted++;
    } catch (err) {
      await client.query('ROLLBACK');
      errors.push(`${s.full_name}: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  return NextResponse.json({
    success: true,
    posted,
    errors,
    message: `Posted capital GL entries for ${posted} shareholder(s).`,
  });
}
