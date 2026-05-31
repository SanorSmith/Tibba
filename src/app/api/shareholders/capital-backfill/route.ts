/**
 * POST /api/shareholders/capital-backfill
 * Posts each active shareholder's paid-in capital to the GL
 * (DR Cash / CR Owner's Capital), so the Balance Sheet equity reflects real
 * shareholder investment. Idempotent — clears + reposts per shareholder.
 */
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { postShareholderCapital } from '@/lib/gl-posting';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

export async function POST() {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const sh = await pool.query(
    `SELECT id, shareholder_id, full_name, COALESCE(investment_amount,0) AS amount
     FROM shareholders
     WHERE status = 'ACTIVE' AND COALESCE(investment_amount,0) > 0`
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
        client, s.id, `${s.full_name} (${s.shareholder_id})`, parseFloat(s.amount) || 0
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
