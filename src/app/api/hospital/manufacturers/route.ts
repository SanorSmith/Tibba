import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  try {
    const r = await pool.query(
      `SELECT id, name, country, contactname AS contact_name, email, phone
       FROM manufacturers
       WHERE ($1 = '' OR name ILIKE $1 OR country ILIKE $1)
       ORDER BY name LIMIT 100`,
      [`%${search}%`]
    );
    return NextResponse.json(r.rows);
  } catch (err: any) {
    // fallback to hospital_manufacturers if manufacturers table schema differs
    try {
      const r2 = await pool.query(
        `SELECT id, name, country, contact_name, email FROM hospital_manufacturers
         WHERE isactive=true AND ($1='' OR name ILIKE $1) ORDER BY name LIMIT 100`,
        [`%${search}%`]
      );
      return NextResponse.json(r2.rows);
    } catch {
      return NextResponse.json([]);
    }
  }
}
