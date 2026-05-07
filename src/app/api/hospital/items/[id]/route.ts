import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { requireAuth } from "@/lib/auth/getCurrentUser";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const r = await pool.query(
    `SELECT i.*, COALESCE(SUM(s.quantity),0)::int AS total_stock
     FROM hospital_items i
     LEFT JOIN hospital_stock s ON s.item_id = i.id
     WHERE i.id = $1 AND i.workspace_id = $2
     GROUP BY i.id`,
    [id, auth.workspaceId]
  );
  if (r.rows.length === 0) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  return NextResponse.json(r.rows[0]);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const b = await req.json();
  const r = await pool.query(
    `UPDATE hospital_items SET
       name=$1, generic_name=$2, itemtype=$3, uom=$4,
       manufacturer=$5, supplier_id=$6, supplier_name=$7, barcode=$8,
       storage_location=$9, storage_type=$10, atc_code=$11,
       form=$12, strength=$13, description=$14,
       min_level=$15, reorder_level=$16, max_level=$17,
       unit_cost=$18, selling_price=$19, notes=$20,
       updatedat=NOW()
     WHERE id=$21 RETURNING *`,
    [
      b.name,
      b.generic_name    || null,
      b.itemtype        || "supply",
      b.uom             || "piece",
      b.manufacturer    || null,
      b.supplier_id     || null,
      b.supplier_name   || null,
      b.barcode         || null,
      b.storage_location|| null,
      b.storage_type    || null,
      b.atc_code        || null,
      b.form            || b.form_type || null,
      b.strength        || null,
      b.description     || null,
      parseInt(b.min_level)    || 0,
      parseInt(b.reorder_level)|| 10,
      parseInt(b.max_level)    || null,
      parseFloat(b.unit_cost)  || null,
      parseFloat(b.selling_price) || null,
      b.notes           || null,
      id,
    ]
  );
  return NextResponse.json(r.rows[0]);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  await pool.query(`UPDATE hospital_items SET isactive=false, updatedat=NOW() WHERE id=$1 AND workspace_id=$2`, [id, auth.workspaceId]);
  return NextResponse.json({ success: true });
}
