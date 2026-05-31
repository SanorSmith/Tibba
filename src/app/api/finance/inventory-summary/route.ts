/**
 * GET /api/finance/inventory-summary
 * Returns real inventory KPIs for the Finance dashboard:
 *   - stock_value     = Σ (quantity × unit_cost)
 *   - low_stock_count = items at or below their reorder level
 * Sourced from hospital_stock + hospital_items.
 */
import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

export async function GET() {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  try {
    const res = await pool.query(`
      SELECT
        COALESCE(SUM(s.quantity * COALESCE(i.unit_cost, 0)), 0)               AS stock_value,
        COUNT(*) FILTER (WHERE s.quantity <= COALESCE(i.reorder_level, 0))    AS low_stock_count,
        COUNT(*)                                                              AS total_stock_rows
      FROM hospital_stock s
      JOIN hospital_items i ON s.item_id = i.id
    `);

    const row = res.rows[0];
    return NextResponse.json({
      success: true,
      stock_value: parseFloat(row.stock_value) || 0,
      low_stock_count: parseInt(row.low_stock_count) || 0,
      total_stock_rows: parseInt(row.total_stock_rows) || 0,
    });
  } catch (error) {
    console.error('[finance/inventory-summary]', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
