/**
 * One warehouse: read, edit, retire.
 *
 * This route opened its own connection from a second environment variable, so
 * it was invisible to the tenant wrapper and to `DATABASE_URL` alike. Every
 * handler now proves the caller belongs to the facility owning the warehouse
 * before touching it, and runs the statement through the shared connection so
 * row-level security applies.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("warehouse", id);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(`SELECT * FROM warehouses WHERE id = $1`, [id]);
    if (!r.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("warehouse", id);
  if (auth.error) return auth.error;

  const { name, warehouse_type, location, manager, description } = await req.json();

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `UPDATE warehouses SET name=$1, warehouse_type=$2, location=$3, manager=$4, description=$5, updated_at=NOW() WHERE id=$6 RETURNING *`,
      [name, warehouse_type, location ?? null, manager ?? null, description ?? null, id],
    );
    if (!r.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("warehouse", id);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
    await pool.query(`UPDATE warehouses SET is_active=false, updated_at=NOW() WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  });
}
