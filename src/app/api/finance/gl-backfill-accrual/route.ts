/**
 * POST /api/finance/gl-backfill-accrual
 * Recognizes revenue (accrual basis) for every invoice that has NO journal entry
 * yet — i.e. unpaid/pending invoices that the payment-based posting skipped.
 * Posts: DR Patient AR + DR Insurance AR / CR Revenue.
 *
 * After this runs, GL revenue = total invoiced, so the Income Statement,
 * Balance Sheet, and Trial Balance all tie to a single source (the GL).
 * Safe to run multiple times — skips invoices already posted (matched by sourceid).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { postInvoiceAccrual } from '@/lib/gl-posting';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  // Backfill only the caller's facility — this swept every hospital's invoices.
  const ws = getWorkspaceId(request);
  if (!ws) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  // Invoices with NO existing journal entry (by sourceid or invoice number in description)
  const invoices = await pool.query(`
    SELECT i.id, i.invoice_number,
           COALESCE(i.total_amount, 0)               AS total_amount,
           COALESCE(i.insurance_coverage_amount, 0)  AS insurance_amount,
           COALESCE(i.invoice_date, CURRENT_DATE)::date AS entry_date
    FROM invoices i
    WHERE i.workspaceid = $1
      AND COALESCE(i.status,'') NOT IN ('CANCELLED')
      AND NOT EXISTS (
        SELECT 1 FROM fin_journal_entries je
        WHERE je.sourcetype = 'INVOICE'
          AND (je.sourceid = i.id
               OR je.description LIKE '%' || i.invoice_number || '%')
      )
    ORDER BY i.invoice_date ASC
  `, [ws]);

  let posted = 0;
  const errors: string[] = [];

  for (const inv of invoices.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await postInvoiceAccrual(
        client,
        ws,
        inv.id,
        inv.invoice_number,
        parseFloat(inv.total_amount) || 0,
        parseFloat(inv.insurance_amount) || 0,
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
    skipped_already_in_gl: 'invoices already posted were excluded',
    errors,
    message: `Posted accrual revenue for ${posted} invoices. ${errors.length} errors.`,
  });
}
