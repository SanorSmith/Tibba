/**
 * /api/shareholders/distributions
 * GET  — list dividend declarations (grouped) or ?view=detail for rows
 * POST — declare a dividend: split a total by each shareholder's equity %,
 *        record per-shareholder rows, update shareholder accounts, post GL.
 *
 * Roadmap: "create invoice in case the auditor needs to share the profit with
 * shareholders" — distribution of profit to shareholders by equity stake.
 */
import { NextRequest, NextResponse } from 'next/server';
import { postDividend } from '@/lib/gl-posting';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


async function ensureTable(p: Pool) {
  await p.query(`
    CREATE TABLE IF NOT EXISTS shareholder_distributions (
      id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      declaration_id     UUID NOT NULL,
      declaration_number VARCHAR(50),
      shareholder_id     UUID,
      shareholder_code   VARCHAR(50),
      shareholder_name   VARCHAR(255),
      dividend_date      DATE NOT NULL DEFAULT CURRENT_DATE,
      total_declared     NUMERIC(15,2) DEFAULT 0,
      share_percentage   NUMERIC(7,4) DEFAULT 0,
      amount             NUMERIC(15,2) DEFAULT 0,
      status             VARCHAR(30) DEFAULT 'PAID',
      notes              TEXT,
      createdat          TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  try {
    const workspaceId = getWorkspaceId(request);
    if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

    await ensureTable(pool);
    const view = new URL(request.url).searchParams.get('view') || 'summary';

    if (view === 'detail') {
      const r = await pool.query(
        `SELECT * FROM shareholder_distributions WHERE workspaceid = $1
         ORDER BY dividend_date DESC, createdat DESC`,
        [workspaceId]
      );
      return NextResponse.json({ success: true, data: r.rows, count: r.rows.length });
    }

    // Summary: one row per declaration
    const r = await pool.query(`
      SELECT declaration_id, declaration_number,
             MAX(dividend_date) AS dividend_date,
             MAX(total_declared) AS total_declared,
             COUNT(*) AS shareholder_count,
             SUM(amount) AS distributed,
             MAX(notes) AS notes,
             MAX(createdat) AS createdat
      FROM shareholder_distributions
      WHERE workspaceid = $1
      GROUP BY declaration_id, declaration_number
      ORDER BY MAX(dividend_date) DESC
    `, [workspaceId]);
    const totalDistributed = r.rows.reduce((s, x) => s + parseFloat(x.distributed || 0), 0);
    return NextResponse.json({ success: true, data: r.rows, count: r.rows.length, total_distributed: totalDistributed });
  } catch (error) {
    console.error('[sh-distributions GET]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // GL entries post to the caller’s facility ledger.
  const ws = getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });
  const client = await pool.connect();
  try {
    await ensureTable(pool);
    const body = await request.json();
    const total = parseFloat(body.total_amount);
    const dividendDate = body.dividend_date || new Date().toISOString().split('T')[0];
    const notes = body.notes || null;

    if (!total || total <= 0) {
      return NextResponse.json({ error: 'total_amount must be > 0' }, { status: 400 });
    }

    // Active shareholders with equity
    const shRes = await pool.query(
      `SELECT id, shareholder_id, full_name, share_percentage
       FROM shareholders
       WHERE status = 'ACTIVE' AND COALESCE(share_percentage,0) > 0
       ORDER BY share_percentage DESC`
    );
    if (shRes.rows.length === 0) {
      return NextResponse.json({ error: 'No active shareholders with equity to distribute to' }, { status: 400 });
    }

    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    const declarationNumber = `DIV-${year}-${rand}`;

    await client.query('BEGIN');

    // Generate a declaration id (group key)
    const declIdRes = await client.query(`SELECT gen_random_uuid() AS id`);
    const declarationId = declIdRes.rows[0].id;

    const breakdown: any[] = [];
    for (const sh of shRes.rows) {
      const pct = parseFloat(sh.share_percentage) || 0;
      const amount = Math.round((total * pct / 100) * 100) / 100;

      await client.query(
        `INSERT INTO shareholder_distributions
           (declaration_id, declaration_number, shareholder_id, shareholder_code, shareholder_name,
            dividend_date, total_declared, share_percentage, amount, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PAID',$10)`,
        [declarationId, declarationNumber, sh.id, sh.shareholder_id, sh.full_name,
         dividendDate, total, pct, amount, notes]
      );

      // Update the shareholder's account
      await client.query(
        `UPDATE shareholders
         SET total_dividends_received = COALESCE(total_dividends_received,0) + $1,
             last_dividend_date = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [amount, dividendDate, sh.id]
      );

      breakdown.push({ shareholder: sh.full_name, code: sh.shareholder_id, percentage: pct, amount });
    }

    // GL: DR Retained Earnings / CR Cash for the whole declaration
    await postDividend(client, ws, declarationId, declarationNumber, total, dividendDate);

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      declaration_id: declarationId,
      declaration_number: declarationNumber,
      total_distributed: total,
      shareholder_count: breakdown.length,
      breakdown,
    }, { status: 201 });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[sh-distributions POST]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  } finally {
    client.release();
  }
}
