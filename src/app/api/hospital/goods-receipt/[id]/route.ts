import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const receipt = await pool.query(`SELECT * FROM hospital_goods_receipt WHERE id=$1`, [id]);
    const items   = await pool.query(`SELECT * FROM hospital_goods_receipt_items WHERE receipt_id=$1 ORDER BY createdat`, [id]);
    return NextResponse.json({ receipt: receipt.rows[0], items: items.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
