import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getWorkspaceId } from "@/lib/workspace";
const pool = new Pool({ connectionString: process.env.TIBBNA_API_URL, ssl: { rejectUnauthorized: false } });
export async function GET(req: NextRequest) {
  const WS = getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const r = await pool.query(
      "SELECT departmentid AS id, name, description AS location, NULL::text AS type FROM departments WHERE workspaceid = $1 ORDER BY name LIMIT 200",
      [WS]
    );
    return NextResponse.json(r.rows);
  } catch (e:any) {
    console.error("Departments error:", e.message);
    return NextResponse.json([]);
  }
}
