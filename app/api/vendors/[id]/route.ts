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
  const { name, code, contactname, phone, email, address, country, paymentterms, currency, notes } = await req.json();
  const r = await pool.query(
    `UPDATE vendors SET name=$1, code=$2, contactname=$3, phone=$4, email=$5, address=$6,
     country=$7, paymentterms=$8, currency=$9, notes=$10, updatedat=NOW()
     WHERE id=$11 RETURNING *`,
    [name, code||null, contactname||null, phone||null, email||null, address||null, country||null, paymentterms||null, currency||"USD", notes||null, id]
  );
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
  await pool.query(`UPDATE vendors SET isactive=false, updatedat=NOW() WHERE id=$1`, [id]);
  return NextResponse.json({ success: true });
}
