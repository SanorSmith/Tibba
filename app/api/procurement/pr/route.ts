import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/user";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET() {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const r = await pool.query(
    `SELECT pr.*, w.name AS "warehouseName",
      (SELECT COUNT(*) FROM purchase_requisition_items pri WHERE pri.prid = pr.id)::int AS "itemCount"
     FROM purchase_requisitions pr
     LEFT JOIN warehouses w ON w.id = pr.warehouseid
     ORDER BY pr.createdat DESC`
  );
  return NextResponse.json(r.rows);
}
