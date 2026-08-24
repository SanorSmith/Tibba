import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/user";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const r = await pool.query(
    `SELECT
      ist.id, ist.quantity, ist.reserved_quantity,
      i.name AS item_name, i.itemcode, i.uom,
      i.reorder_level
    FROM inventory_stock ist
    JOIN items i ON i.id = ist.item_id
    WHERE ist.warehouse_id = $1
      AND i.is_active = true
    ORDER BY i.name`,
    [id]
  );
  return NextResponse.json(r.rows);
}
