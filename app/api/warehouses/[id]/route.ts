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
  const r = await pool.query(`SELECT * FROM warehouses WHERE id = $1`, [id]);
  if (!r.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name, warehouse_type, location, manager, description } = await req.json();
  const r = await pool.query(
    `UPDATE warehouses SET name=$1, warehouse_type=$2, location=$3, manager=$4, description=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
    [name, warehouse_type, location ?? null, manager ?? null, description ?? null, id]
  );
  if (!r.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await pool.query(`UPDATE warehouses SET is_active=false, updated_at=NOW() WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}