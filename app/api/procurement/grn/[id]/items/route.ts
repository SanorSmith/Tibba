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
    `SELECT gi.*, i.name AS "itemName", i.uom
     FROM grn_items gi
     LEFT JOIN items i ON i.id = gi.itemid
     WHERE gi.grnid = $1 ORDER BY gi.createdat`,
    [id]
  );
  return NextResponse.json(r.rows);
}
