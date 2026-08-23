import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/user";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET() {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const r = await pool.query(
    `SELECT uc.*, i.name AS "itemName"
     FROM unit_conversions uc
     LEFT JOIN items i ON i.id = uc.item_id
     ORDER BY i.name, uc.from_uom`
  );
  return NextResponse.json(r.rows);
}

export async function POST(req: NextRequest) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { item_id, from_uom, to_uom, factor } = await req.json();
  if (!from_uom||!to_uom||!factor) return NextResponse.json({ error: "from_uom, to_uom and factor required" }, { status:400 });
  const r = await pool.query(
    `INSERT INTO unit_conversions (id, item_id, from_uom, to_uom, factor, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW()) RETURNING *`,
    [item_id||null, from_uom, to_uom, factor]
  );
  return NextResponse.json(r.rows[0]);
}
