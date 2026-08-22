import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Departments are per-facility, so an id from another hospital reads as null.
  const WS = getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const r = await pool.query(
      `SELECT departmentid AS id, name, description AS location, NULL::text AS type
       FROM departments WHERE departmentid = $1 AND workspaceid = $2`,
      [id, WS]
    );
    return NextResponse.json(r.rows[0] ?? null);
  } catch (e: any) {
    return NextResponse.json(null);
  }
}
