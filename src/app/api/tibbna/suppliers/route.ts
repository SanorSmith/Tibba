import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.TIBBNA_API_URL, ssl: { rejectUnauthorized: false } });
export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  try {
    const r = await pool.query(
      `SELECT supplierid AS id, name, contactperson AS contact_person,
              email, phonenumber AS phone, city, country
       FROM suppliers
       WHERE isactive = true
         AND ($1 = '' OR name ILIKE $1 OR city ILIKE $1)
       ORDER BY name LIMIT 100`,
      [`%${search}%`]
    );
    return NextResponse.json(r.rows);
  } catch (e: any) {
    console.error("Suppliers error:", e.message);
    return NextResponse.json([]);
  }
}

