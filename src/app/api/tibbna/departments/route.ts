import { NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.TIBBNA_API_URL, ssl: { rejectUnauthorized: false } });
export async function GET() {
  try {
    const r = await pool.query("SELECT departmentid AS id, name, description AS location, NULL::text AS type FROM departments ORDER BY name LIMIT 200");
    return NextResponse.json(r.rows);
  } catch (e:any) {
    console.error("Departments error:", e.message);
    return NextResponse.json([]);
  }
}
