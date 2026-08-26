/**
 * One vendor: edit, retire.
 *
 * This route opened its own connection from a second environment variable, so
 * it was invisible to the tenant wrapper and to `DATABASE_URL` alike. Both
 * handlers now prove the caller belongs to the facility owning the vendor
 * before writing, and run through the shared connection so row-level security
 * applies.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("vendor", id);
  if (auth.error) return auth.error;

  const { name, code, contactname, phone, email, address, country, paymentterms, currency, notes } =
    await req.json();

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `UPDATE vendors SET name=$1, code=$2, contactname=$3, phone=$4, email=$5, address=$6,
       country=$7, paymentterms=$8, currency=$9, notes=$10, updatedat=NOW()
       WHERE id=$11 RETURNING *`,
      [
        name,
        code || null,
        contactname || null,
        phone || null,
        email || null,
        address || null,
        country || null,
        paymentterms || null,
        currency || "USD",
        notes || null,
        id,
      ],
    );
    if (!r.rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(r.rows[0]);
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorizeRecord("vendor", id);
  if (auth.error) return auth.error;

  return await withTenant(auth.workspaceid, async () => {
    await pool.query(`UPDATE vendors SET isactive=false, updatedat=NOW() WHERE id=$1`, [id]);
    return NextResponse.json({ success: true });
  });
}
