import { Pool } from "pg";

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const search = req.nextUrl.searchParams.get("search") ?? "";
    const r = await pool.query(
      `SELECT * FROM manufacturers
       WHERE workspace_id = $1 AND isactive = true
         AND ($2 = '' OR name ILIKE $2 OR country ILIKE $2 OR code ILIKE $2)
       ORDER BY name`,
      [WS, `%${search}%`]
    );
    return NextResponse.json(r.rows);
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, code, country, contactname, phone, email, address, website, license_number, product_types, notes } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const r = await pool.query(
    `INSERT INTO manufacturers (id, workspace_id, name, code, country, contactname, phone, email, address, website, license_number, product_types, notes, isactive, createdat, updatedat)
     VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,NOW(),NOW()) RETURNING *`,
    [WS, name, code||null, country||null, contactname||null, phone||null, email||null, address||null, website||null, license_number||null, product_types||null, notes||null]
  );
  return NextResponse.json(r.rows[0]);
}
