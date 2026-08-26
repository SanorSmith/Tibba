/**
 * Pharmacy stock totals for the dashboard.
 *
 * The facility was already required here, but only as a query filter — it was
 * never proved against membership, and the statements ran outside any tenant.
 * Both are now handled before the first query.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { requireWorkspace } from "@/lib/db/require-workspace";

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req);
  if (auth.error) return auth.error;
  const workspaceId = auth.workspaceid;

  try {
    return await withTenant(workspaceId, async () => {

    // Get pharmacy warehouses first
    const whRes = await pool.query(`
      SELECT id FROM warehouses WHERE warehouse_type = 'pharmacy' AND is_active = true
    `);
    
    if (!whRes.rows.length) {
      return NextResponse.json({
        totalItems: 0,
        lowStock: 0,
        outOfStock: 0,
        totalValue: 0,
        expiringSoon: 0,
        criticalItems: 0
      });
    }

    const whIds = whRes.rows.map((r: any) => r.id);

    // Get pharmacy inventory summary - only count items with batches that have pricing
    const summary = await pool.query(`
      WITH item_stock AS (
        SELECT DISTINCT ON (i.id)
          i.id,
          i.reorder_level,
          COALESCE((
            SELECT SUM(ist.quantity) 
            FROM inventory_stock ist 
            WHERE ist.item_id = i.id AND ist.warehouse_id = ANY($1::uuid[])
          ), 0) as total_stock,
          (
            SELECT MAX(ib.unit_cost) 
            FROM item_batches ib 
            WHERE ib.item_id = i.id 
              AND ib.warehouse_id = ANY($1::uuid[])
              AND ib.unit_cost IS NOT NULL
          ) as unit_cost
        FROM items i
        WHERE i.is_active = true 
          AND i.workspace_id = $2
          AND (i.inventory_category = 'pharmacy' OR i.inventory_category = 'pharmacy')
          AND EXISTS (
            SELECT 1 FROM item_batches ib
            WHERE ib.item_id = i.id
              AND ib.warehouse_id = ANY($1::uuid[])
              AND (ib.unit_cost IS NOT NULL OR ib.selling_price IS NOT NULL)
          )
      )
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE total_stock > 0 AND total_stock <= reorder_level) as low_stock,
        COUNT(*) FILTER (WHERE total_stock = 0) as out_of_stock,
        COALESCE(SUM(total_stock * COALESCE(unit_cost, 0)), 0) as total_value
      FROM item_stock
    `, [whIds, workspaceId]);

    // Get expiring soon items (within 30 days)
    const expiring = await pool.query(`
      SELECT COUNT(DISTINCT ib.item_id) as expiring_soon
      FROM item_batches ib
      WHERE ib.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        AND ib.expiry_date > CURRENT_DATE
        AND ib.item_id IN (
          SELECT id FROM items WHERE workspace_id = $1 AND is_active = true
        )
    `, [workspaceId]);

    const result = summary.rows[0];
    const expiringResult = expiring.rows[0];

    console.log('[Pharmacy Summary API] Workspace ID:', workspaceId);
    console.log('[Pharmacy Summary API] Warehouse IDs:', whIds);
    console.log('[Pharmacy Summary API] Raw result:', result);

    const response = {
      totalItems: parseInt(result.total_items) || 0,
      lowStock: parseInt(result.low_stock) || 0,
      outOfStock: parseInt(result.out_of_stock) || 0,
      totalValue: parseFloat(result.total_value) || 0,
      expiringSoon: parseInt(expiringResult.expiring_soon) || 0,
      criticalItems: parseInt(result.low_stock) || 0 // Low stock items as critical
    };

    console.log('[Pharmacy Summary API] Returning:', response);

    return NextResponse.json(response);
    });
  } catch (error) {
    console.error("[Pharmacy Summary API]", error);
    return NextResponse.json({ error: "Failed to fetch pharmacy summary" }, { status: 500 });
  }
}
