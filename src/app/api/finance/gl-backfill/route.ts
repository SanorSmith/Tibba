/**
 * POST /api/finance/gl-backfill
 * Posts GL journal entries for all PAID/PARTIAL invoices that don't yet
 * have a journal entry in fin_journal_entries.
 * Safe to call multiple times — skips invoices already posted.
 *
 * Returns: { posted: number, skipped: number, errors: string[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { postInvoicePayment } from '@/lib/gl-posting';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  // Backfill only the caller's facility. This used to sweep every invoice in
  // the database into one ledger regardless of which hospital issued it.
  const ws = getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Find PAID/PARTIAL invoices that have no matching POSTED journal entry
  const invoices = await pool.query(`
    SELECT
      i.id,
      i.invoice_number,
      COALESCE(i.patient_responsibility,  i.total_amount) AS patient_payment,
      COALESCE(i.insurance_coverage_amount, 0)            AS insurance_payment,
      COALESCE(i.payment_date, i.invoice_date)::date      AS entry_date
    FROM invoices i
    WHERE i.workspaceid = $1
      AND i.status IN ('PAID', 'PARTIAL', 'PARTIALLY_PAID')
      AND NOT EXISTS (
        SELECT 1 FROM fin_journal_entries je
        WHERE je.sourcetype = 'INVOICE'
          AND je.description LIKE '%' || i.invoice_number || '%'
      )
    ORDER BY i.invoice_date ASC
  `, [ws]);

  let posted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const inv of invoices.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await postInvoicePayment(
        client,
        ws,
        inv.id,
        inv.invoice_number,
        parseFloat(inv.patient_payment) || 0,
        parseFloat(inv.insurance_payment) || 0,
        inv.entry_date?.toISOString?.()?.split('T')[0] ?? new Date().toISOString().split('T')[0]
      );
      await client.query('COMMIT');
      posted++;
    } catch (err) {
      await client.query('ROLLBACK');
      errors.push(`${inv.invoice_number}: ${(err as Error).message}`);
    } finally {
      client.release();
    }
  }

  return NextResponse.json({
    success: true,
    posted,
    skipped,
    errors,
    message: `Posted ${posted} journal entries. ${errors.length} errors.`,
  });
}
