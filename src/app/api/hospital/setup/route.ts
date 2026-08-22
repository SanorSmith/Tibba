import { NextResponse } from "next/server";
import { pool } from '@/lib/db/pool';

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_purchase_notes (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        -- No default: an insert that forgets the facility must fail loudly
        -- rather than silently filing the row under Hospital 1.
        workspace_id    UUID NOT NULL,
        note_number     TEXT UNIQUE,
        order_id        UUID REFERENCES hospital_orders(id),
        order_number    TEXT,
        supplier_name   TEXT,
        supplier_ref    TEXT,
        delivery_date   DATE DEFAULT CURRENT_DATE,
        created_by      TEXT,
        status          TEXT DEFAULT 'PENDING',
        notes           TEXT,
        createdat       TIMESTAMPTZ DEFAULT NOW(),
        updatedat       TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hospital_purchase_note_items (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        note_id          UUID NOT NULL REFERENCES hospital_purchase_notes(id) ON DELETE CASCADE,
        item_id          UUID REFERENCES hospital_items(id),
        item_name        TEXT NOT NULL,
        uom              TEXT,
        ordered_qty      INTEGER DEFAULT 0,
        delivered_qty    INTEGER DEFAULT 0,
        unit_cost        NUMERIC(10,2),
        batch_number     TEXT,
        lot_number       TEXT,
        expiry_date      DATE,
        manufacture_date DATE,
        notes            TEXT,
        createdat        TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const r = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name LIKE 'hospital_purchase%'
    `);

    return NextResponse.json({ success: true, tables: r.rows.map((r:any) => r.table_name) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
