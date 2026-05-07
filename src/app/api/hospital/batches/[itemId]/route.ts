import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const r = await pool.query(
    `SELECT b.*, d.name AS department_name
     FROM hospital_batches b
     LEFT JOIN departments d ON d.departmentid = b.department_id
     WHERE b.item_id=$1
     ORDER BY b.expiry_date ASC NULLS LAST`,
    [itemId]
  );
  return NextResponse.json(r.rows);
}
