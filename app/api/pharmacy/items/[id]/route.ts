/**
 * One inventory item: edit, retire.
 *
 * Both handlers took an id and wrote to it with no facility in scope, so any
 * signed-in user could rename or retire another hospital's item. The item now
 * decides the facility and membership is proved before the write.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";


type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authorizeRecord("item", id);
    if (auth.error) return auth.error;
    const body = await req.json();

    const {
      name, genericname, itemcode, itemtype, uom, manufacturer,
      description, barcode, min_level, max_level, controlled,
      unit_cost, selling_price, storage_location_id, supplier_id,
    } = body;

    return await withTenant(auth.workspaceid, async () => {
    await pool.query(
      `UPDATE items SET
        name              = COALESCE($1,  name),
        generic_name      = COALESCE($2,  generic_name),
        itemcode          = COALESCE($3,  itemcode),
        itemtype          = COALESCE($4,  itemtype),
        uom               = COALESCE($5,  uom),
        manufacturer      = COALESCE($6,  manufacturer),
        description       = COALESCE($7,  description),
        barcode           = COALESCE($8,  barcode),
        min_level         = COALESCE($9,  min_level),
        max_level         = COALESCE($10, max_level),
        controlled        = COALESCE($11, controlled),
        storage_location_id = $12,
        supplier_id       = $13
      WHERE id = $14`,
      [
        name || null, genericname || null, itemcode || null,
        itemtype || null, uom || null, manufacturer || null,
        description || null, barcode || null,
        min_level != null ? parseInt(min_level) : null,
        max_level != null ? parseInt(max_level) : null,
        controlled != null ? controlled : null,
        storage_location_id || null,
        supplier_id || null,
        id,
      ]
    );

    return NextResponse.json({ success: true });
    });
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authorizeRecord("item", id);
    if (auth.error) return auth.error;

    return await withTenant(auth.workspaceid, async () => {
      await pool.query(`UPDATE items SET is_active = false WHERE id = $1`, [id]);
      return NextResponse.json({ success: true });
    });
  } catch (error) {
    console.error("Error deactivating item:", error);
    return NextResponse.json({ error: "Failed to deactivate item" }, { status: 500 });
  }
}
