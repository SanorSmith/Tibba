import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const WS = "cec4d702-6dae-4ea5-9a30-ef17842c00fd";

export async function GET(req: NextRequest) {
  const deptId  = req.nextUrl.searchParams.get("department_id") ?? "";
  const type    = req.nextUrl.searchParams.get("type") ?? "";
  const page    = parseInt(req.nextUrl.searchParams.get("page") ?? "1");
  const limit   = 15;
  const offset  = (page - 1) * limit;

  try {
    const r = await pool.query(
      `SELECT h.*, d.name AS department_name
       FROM hospital_history h
       LEFT JOIN departments d ON d.departmentid = h.department_id
       WHERE h.workspace_id = $1
         AND ($2 = '' OR h.department_id::text = $2)
         AND ($3 = '' OR h.action_type = $3)
       ORDER BY h.createdat DESC
       LIMIT $4 OFFSET $5`,
      [WS, deptId, type, limit, offset]
    );
    const total = await pool.query(
      `SELECT COUNT(*) FROM hospital_history WHERE workspace_id=$1 AND ($2='' OR department_id::text=$2) AND ($3='' OR action_type=$3)`,
      [WS, deptId, type]
    );
    return NextResponse.json({ rows: r.rows, total: parseInt(total.rows[0].count) });
  } catch (e: any) {
    console.error("GET /api/hospital/history error:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
