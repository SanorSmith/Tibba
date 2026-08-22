/**
 * GET /api/finance/inventory-summary
 * Returns real inventory KPIs for the Finance dashboard:
 *   - stock_value     = Σ (quantity × unit_cost)
 *   - low_stock_count = items at or below their reorder level
 * Sourced from hospital_stock + hospital_items.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceId } from '@/lib/workspace';
import { pool } from '@/lib/db/pool';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  if (!pool) return NextResponse.json({ error: 'DB not configured' }, { status: 500 });

  const workspaceId = getWorkspaceId(request);
  if (!workspaceId) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  try {
    const res = await pool.query(`
      SELECT
        COALESCE(SUM(s.quantity * COALESCE(i.unit_cost, 0)), 0)               AS stock_value,
        COUNT(*) FILTER (WHERE s.quantity <= COALESCE(i.reorder_level, 0))    AS low_stock_count,
        COUNT(*)                                                              AS total_stock_rows
      FROM hospital_stock s
      -- hospital_items uses workspace_id, hospital_stock uses workspaceid.
      JOIN hospital_items i ON s.item_id = i.id AND i.workspace_id = $1
      WHERE s.workspaceid = $1
    `, [workspaceId]);

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
