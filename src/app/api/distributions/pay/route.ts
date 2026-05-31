import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { postStakeholderPayment } from '@/lib/gl-posting';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

/**
 * POST /api/distributions/pay
 * Mark one or more invoice_shares as PAID and optionally create a profit_distributions record.
 *
 * Body (option A — pay individual shares):
 *   { share_ids: string[], payment_date?: string, notes?: string }
 *
 * Body (option B — pay all pending for a stakeholder):
 *   { stakeholder_id: string, payment_date?: string, notes?: string, create_distribution?: boolean }
 */
export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const client = await pool.connect();
  try {
    const body = await request.json();
    const {
      share_ids,
      stakeholder_id,
      payment_date = new Date().toISOString().split('T')[0],
      notes,
      create_distribution = false,
    } = body;

    if (!share_ids?.length && !stakeholder_id) {
      return NextResponse.json(
        { error: 'Provide either share_ids[] or stakeholder_id' },
        { status: 400 }
      );
    }

    // Ensure the linking column exists BEFORE the transaction — otherwise the
    // distribution_id UPDATE aborts the tx and the whole payment silently rolls back.
    await pool.query(`ALTER TABLE invoice_shares ADD COLUMN IF NOT EXISTS distribution_id UUID`).catch(() => {});

    await client.query('BEGIN');

    let updatedShares: any[] = [];

    if (share_ids?.length) {
      // Pay specific shares by ID
      const result = await client.query(
        `UPDATE invoice_shares
         SET payment_status = 'PAID',
             payment_date   = $1,
             notes          = COALESCE($2, notes),
             updatedat      = NOW()
         WHERE id = ANY($3::uuid[])
           AND payment_status = 'PENDING'
         RETURNING *`,
        [payment_date, notes ?? null, share_ids]
      );
      updatedShares = result.rows;
    } else {
      // Pay ALL pending shares for this stakeholder
      const result = await client.query(
        `UPDATE invoice_shares
         SET payment_status = 'PAID',
             payment_date   = $1,
             notes          = COALESCE($2, notes),
             updatedat      = NOW()
         WHERE stakeholder_id = $3
           AND payment_status = 'PENDING'
         RETURNING *`,
        [payment_date, notes ?? null, stakeholder_id]
      );
      updatedShares = result.rows;
    }

    if (updatedShares.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'No pending shares found to pay' },
        { status: 404 }
      );
    }

    // Optionally create a profit_distributions record that groups the payment
    let distribution: any = null;
    if (create_distribution || stakeholder_id) {
      const totalAmount = updatedShares.reduce(
        (sum, s) => sum + parseFloat(s.share_amount || 0), 0
      );

      // Determine stakeholder(s) involved
      const stkId =
        stakeholder_id ||
        (updatedShares.every(s => s.stakeholder_id === updatedShares[0].stakeholder_id)
          ? updatedShares[0].stakeholder_id
          : null);

      if (stkId) {
        // Get date range covered
        const invoiceDates = await client.query(
          `SELECT MIN(i.invoice_date) AS min_date, MAX(i.invoice_date) AS max_date
           FROM invoices i
           WHERE i.id = ANY(
             SELECT DISTINCT invoice_id FROM invoice_shares WHERE id = ANY($1::uuid[])
           )`,
          [updatedShares.map(s => s.id)]
        );

        const minDate = invoiceDates.rows[0]?.min_date ?? payment_date;
        const maxDate = invoiceDates.rows[0]?.max_date ?? payment_date;

        const distResult = await client.query(
          `INSERT INTO profit_distributions
             (stakeholder_id, period_from, period_to, total_shares_amount, status, payment_date, notes, createdat, updatedat)
           VALUES ($1, $2, $3, $4, 'PAID', $5, $6, NOW(), NOW())
           RETURNING *`,
          [stkId, minDate, maxDate, totalAmount, payment_date, notes ?? null]
        );
        distribution = distResult.rows[0];

        // Link shares → distribution if column exists (graceful — skip if no FK column)
        try {
          await client.query(
            `UPDATE invoice_shares
             SET distribution_id = $1
             WHERE id = ANY($2::uuid[])`,
            [distribution.id, updatedShares.map(s => s.id)]
          );
        } catch {
          // column may not exist yet; non-fatal
        }

        // ── Post to the General Ledger so accounting sees the payout ──
        // DR Provider Fees Expense / CR Cash & Bank
        const nameRes = await client.query(
          `SELECT COALESCE(name_en, name_ar, stakeholder_code) AS name FROM stakeholders WHERE id = $1`,
          [stkId]
        );
        const stkName = nameRes.rows[0]?.name || 'Provider';
        const d = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : '');
        await postStakeholderPayment(
          client,
          distribution.id,
          `${stkName} (${d(minDate)} → ${d(maxDate)})`,
          totalAmount,
          payment_date
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      paid_count: updatedShares.length,
      total_paid: updatedShares.reduce((s, r) => s + parseFloat(r.share_amount || 0), 0),
      distribution,
      shares: updatedShares,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[distributions/pay POST]', error);
    return NextResponse.json(
      { error: 'Failed to process payment', detail: (error as Error).message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
