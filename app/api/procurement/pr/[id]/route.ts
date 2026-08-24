import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getUser } from "@/lib/user";
const pool = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json();
  await pool.query(`UPDATE purchase_requisitions SET status=$1, updatedat=NOW() WHERE id=$2`, [status, id]);
  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const r = await pool.query(`SELECT * FROM purchase_requisitions WHERE id=$1`, [id]);
  return NextResponse.json(r.rows[0] ?? null);
}
