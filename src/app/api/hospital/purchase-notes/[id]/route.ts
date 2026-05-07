import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await pool.query(`ALTER TABLE hospital_purchase_note_items ADD COLUMN IF NOT EXISTS delivered_total INTEGER`).catch(()=>{});
    await pool.query(`ALTER TABLE hospital_purchase_note_items ADD COLUMN IF NOT EXISTS claim_damage INTEGER`).catch(()=>{});
    const note  = await pool.query(`SELECT * FROM hospital_purchase_notes WHERE id=$1`, [id]);
    const items = await pool.query(`SELECT * FROM hospital_purchase_note_items WHERE note_id=$1 ORDER BY createdat`, [id]);
    return NextResponse.json({ note: note.rows[0], items: items.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  await pool.query(`UPDATE hospital_purchase_notes SET status=$1, updatedat=NOW() WHERE id=$2`, [status, id]);
  return NextResponse.json({ success: true });
}
