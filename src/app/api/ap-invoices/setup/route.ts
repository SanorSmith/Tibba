/**
 * GET /api/ap-invoices/setup
 * One-time migration: creates ap_invoices and grn tables (if they don't exist)
 * and adds the is_paid column to leave_types.
 * Safe to call multiple times — all statements are CREATE IF NOT EXISTS / ADD IF NOT EXISTS.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

export async function GET(request: NextRequest) {
  // Schema/seed utility. These endpoints create tables, seed rows and — in
  // the appointments cases — drop foreign-key constraints on tables shared by
  // every facility, so the blast radius is the whole platform rather than one
  // hospital. A workspace filter is not the right control here; requiring a
  // session is the minimum. These should probably be deleted outright, but
  // that is a call for the repo owner, not something to do silently.
  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const client = await pool.connect();
  const log: string[] = [];

  try {
    await client.query('BEGIN');

    // ── 1. goods_receipt_notes ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS goods_receipt_notes (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        po_id           UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
        grn_number      VARCHAR(50) UNIQUE,
        grn_date        DATE NOT NULL DEFAULT CURRENT_DATE,
        vendor_id       UUID,
        received_by     VARCHAR(255),
        warehouse_id    UUID,
        status          VARCHAR(30) DEFAULT 'RECEIVED',
        notes           TEXT,
        ap_invoice_id   UUID,           -- set after AP invoice is created
        createdat       TIMESTAMPTZ DEFAULT NOW(),
        updatedat       TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    log.push('goods_receipt_notes OK');

    // ── 2. grn_items ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS grn_items (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        grn_id          UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
        po_item_id      UUID,
        item_name       VARCHAR(255) NOT NULL,
        item_code       VARCHAR(100),
        ordered_qty     NUMERIC(12,3) DEFAULT 0,
        received_qty    NUMERIC(12,3) NOT NULL,
        unit            VARCHAR(50),
        unit_price      NUMERIC(15,2) DEFAULT 0,
        total_price     NUMERIC(15,2) GENERATED ALWAYS AS (received_qty * unit_price) STORED,
        notes           TEXT,
        createdat       TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    log.push('grn_items OK');

    // ── 3. ap_invoices ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS ap_invoices (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ap_number       VARCHAR(50) UNIQUE,
        grn_id          UUID REFERENCES goods_receipt_notes(id) ON DELETE SET NULL,
        po_id           UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
        vendor_id       UUID,
        vendor_name     VARCHAR(255),
        invoice_date    DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date        DATE,
        subtotal        NUMERIC(15,2) DEFAULT 0,
        discount_amount NUMERIC(15,2) DEFAULT 0,
        total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
        amount_paid     NUMERIC(15,2) DEFAULT 0,
        balance_due     NUMERIC(15,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
        status          VARCHAR(30)   DEFAULT 'PENDING',
        payment_date    DATE,
        payment_method  VARCHAR(50),
        payment_ref     VARCHAR(255),
        notes           TEXT,
        gl_journal_id   UUID,           -- set after GL posting
        createdat       TIMESTAMPTZ DEFAULT NOW(),
        updatedat       TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    log.push('ap_invoices OK');

    // ── 4. Link GRN → ap_invoices FK (add column if missing) ─────────
    try {
      await client.query(`
        ALTER TABLE goods_receipt_notes
          ADD COLUMN IF NOT EXISTS ap_invoice_id UUID REFERENCES ap_invoices(id) ON DELETE SET NULL
      `);
      log.push('goods_receipt_notes.ap_invoice_id FK OK');
    } catch {
      log.push('goods_receipt_notes.ap_invoice_id already exists');
    }

    // ── 5. leave_types.is_paid (for payroll deduction) ────────────────
    try {
      await client.query(`
        ALTER TABLE leave_types
          ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT true
      `);
      // Mark 'UNPAID' category leaves as not paid
      await client.query(`
        UPDATE leave_types SET is_paid = false
        WHERE UPPER(category) = 'UNPAID' AND is_paid IS DISTINCT FROM false
      `);
      log.push('leave_types.is_paid OK');
    } catch {
      log.push('leave_types.is_paid already exists or skipped');
    }

    // ── 6. payroll_transactions new columns ───────────────────────────
    try {
      await client.query(`
        ALTER TABLE payroll_transactions
          ADD COLUMN IF NOT EXISTS unpaid_leave_deduction NUMERIC(15,2) DEFAULT 0,
          ADD COLUMN IF NOT EXISTS unpaid_leave_days      NUMERIC(5,1)  DEFAULT 0
      `);
      log.push('payroll_transactions unpaid_leave cols OK');
    } catch {
      log.push('payroll_transactions leave cols already exist');
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, log });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[ap-invoices/setup]', error);
    return NextResponse.json({ error: (error as Error).message, log }, { status: 500 });
  } finally {
    client.release();
  }
}
