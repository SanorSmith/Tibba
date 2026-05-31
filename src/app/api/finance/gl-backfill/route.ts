/**
 * POST /api/finance/gl-backfill
 * Posts GL journal entries for all PAID/PARTIAL invoices that don't yet
 * have a journal entry in fin_journal_entries.
 * Safe to call multiple times — skips invoices already posted.
 *
 * Returns: { posted: number, skipped: number, errors: string[] }
 */
import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { postInvoicePayment } from '@/lib/gl-posting';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

export async function POST() {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  // Find PAID/PARTIAL invoices that have no matching POSTED journal entry
  const invoices = await pool.query(`
    SELECT
      i.id,
      i.invoice_number,
      COALESCE(i.patient_responsibility,  i.total_amount) AS patient_payment,
      COALESCE(i.insurance_coverage_amount, 0)            AS insurance_payment,
      COALESCE(i.payment_date, i.invoice_date)::date      AS entry_date
    FROM invoices i
    WHERE i.status IN ('PAID', 'PARTIAL', 'PARTIALLY_PAID')
      AND NOT EXISTS (
        SELECT 1 FROM fin_journal_entries je
        WHERE je.sourcetype = 'INVOICE'
          AND je.description LIKE '%' || i.invoice_number || '%'
      )
    ORDER BY i.invoice_date ASC
  `);

  let posted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const inv of invoices.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await postInvoicePayment(
        client,
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
