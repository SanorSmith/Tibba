import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = await pool.query(
      `SELECT departmentid AS id, name, description AS location, NULL::text AS type
       FROM departments WHERE departmentid = $1`,
      [id]
    );
    return NextResponse.json(r.rows[0] ?? null);
  } catch (e: any) {
    return NextResponse.json(null);
  }
}
