import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceId } from "@/lib/workspace";
import { pool } from '@/lib/db/pool';
import { withTenant } from '@/lib/db/tenant';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A receipt from another facility must read as "not found", not as data.
  const WS = await getWorkspaceId(req);
  if (!WS) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Carries this facility on the connection, so row-level security
  // scopes every query below in the database rather than relying on
  // each one remembering its WHERE clause.
  return withTenant(WS, async () => {
  try {
    const receipt = await pool.query(
      `SELECT * FROM hospital_goods_receipt WHERE id=$1 AND workspace_id=$2`,
      [id, WS]
    );
    if (receipt.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const items = await pool.query(`SELECT * FROM hospital_goods_receipt_items WHERE receipt_id=$1 ORDER BY createdat`, [id]);
    return NextResponse.json({ receipt: receipt.rows[0], items: items.rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
  });
}
