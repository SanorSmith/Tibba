import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { requireAuth } from "@/lib/auth/getCurrentUser";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const WS = auth.workspaceId;
  const search = req.nextUrl.searchParams.get("search") ?? "";
  try {
    const r = await pool.query(
      `SELECT i.*,
        COALESCE(SUM(s.quantity), 0)::int AS total_stock,
        COUNT(DISTINCT b.id)::int AS batch_count
       FROM hospital_items i
       LEFT JOIN hospital_stock s ON s.item_id = i.id
       LEFT JOIN hospital_batches b ON b.item_id = i.id
       WHERE i.workspace_id = $1 AND i.isactive = true
         AND ($2 = '' OR i.name ILIKE $2 OR i.itemcode ILIKE $2
              OR i.generic_name ILIKE $2 OR i.barcode ILIKE $2)
       GROUP BY i.id
       ORDER BY i.name`,
      [WS, `%${search}%`]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    console.error("GET /api/hospital/items error:", e.message);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const WS = auth.workspaceId;
  try {
    const b = await req.json();
    if (!b.name?.trim()) {
      return NextResponse.json({ error: "Item name is required" }, { status: 400 });
    }

    const code = b.itemcode?.trim() || `HSP-${Date.now().toString().slice(-6)}`;

    // First check which columns exist in the table
    const colCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'hospital_items' AND table_schema = 'public'`
    );
    const cols = new Set(colCheck.rows.map((r: any) => r.column_name));

    const hasSupplier = cols.has("supplier_id") && cols.has("supplier_name");

    let query: string;
    let values: any[];

    if (hasSupplier) {
      query = `INSERT INTO hospital_items (
        id, workspace_id, name, generic_name, itemcode, itemtype, uom,
        manufacturer, supplier_id, supplier_name, barcode,
        storage_location, storage_type, strength,
        min_level, reorder_level, max_level,
        unit_cost, selling_price, notes, isactive, createdat, updatedat
      ) VALUES (
        gen_random_uuid(),$1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,
        $11,$12,$13,$14,
        $15,$16,$17,
        $18,$19,$20,true,NOW(),NOW()
      ) RETURNING *`;
      values = [
        WS, b.name, b.generic_name||null, code,
        b.itemtype||"supply", b.uom||"piece",
        b.manufacturer||null, b.supplier_id||null, b.supplier_name||null, b.barcode||null,
        b.storage_location||null, b.storage_type||null, b.strength||null, b.form||null,
        parseInt(b.min_level)||0, parseInt(b.reorder_level)||10, parseInt(b.max_level)||null,
        parseFloat(b.unit_cost)||null, parseFloat(b.selling_price)||null, b.notes||null,
      ];
    } else {
      // Fallback without supplier columns
      query = `INSERT INTO hospital_items (
        id, workspace_id, name, generic_name, itemcode, itemtype, uom,
        manufacturer, barcode, storage_location, storage_type, strength,
        min_level, reorder_level, max_level,
        unit_cost, selling_price, notes, isactive, createdat, updatedat
      ) VALUES (
        gen_random_uuid(),$1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,
        $13,$14,$15,
        $16,$17,$18,true,NOW(),NOW()
      ) RETURNING *`;
      values = [
        WS, b.name, b.generic_name||null, code,
        b.itemtype||"supply", b.uom||"piece",
        b.manufacturer||null, b.barcode||null,
        b.storage_location||null, b.storage_type||null, b.strength||null, b.form||null,
        parseInt(b.min_level)||0, parseInt(b.reorder_level)||10, parseInt(b.max_level)||null,
        parseFloat(b.unit_cost)||null, parseFloat(b.selling_price)||null, b.notes||null,
      ];
    }

    const r = await pool.query(query, values);
    return NextResponse.json(r.rows[0]);

  } catch (e: any) {
    console.error("POST /api/hospital/items error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
