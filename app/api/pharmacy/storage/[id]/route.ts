/**
 * One storage section: edit, retire.
 *
 * Both handlers wrote to a section by id with no facility in scope, so any
 * signed-in user could rename or retire another pharmacy's shelf. The section
 * now decides the facility, and membership is proved before the write.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { authorizeRecord } from "@/lib/db/authorize-record";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await authorizeRecord("warehouse_section", id);
  if (auth.error) return auth.error;

  try {
    const { name, location, type, temperature, notes } = await req.json();
    const isTemperatureControlled =
      temperature === true || temperature === "true" || temperature === 1;

    return await withTenant(auth.workspaceid, async () => {
      const r = await pool.query(
        `UPDATE warehouse_sections
         SET sectionname = COALESCE($1, sectionname),
             bin_location = COALESCE($2, bin_location),
             section_type = COALESCE($3, section_type),
             temperature_controlled = COALESCE($4, temperature_controlled),
             description = COALESCE($5, description)
         WHERE id = $6
         RETURNING id, sectionname as name, bin_location as location, section_type as type,
                   temperature_controlled, temperature_controlled as temperature, description as notes`,
        [name || null, location || null, type || null, isTemperatureControlled, notes || null, id],
      );

      if (!r.rows.length) {
        return NextResponse.json({ error: "Storage location not found" }, { status: 404 });
      }
      return NextResponse.json(r.rows[0]);
    });
  } catch (error) {
    console.error("Error updating storage location:", error);
    return NextResponse.json({ error: "Failed to update storage location" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await authorizeRecord("warehouse_section", id);
  if (auth.error) return auth.error;

  try {
    return await withTenant(auth.workspaceid, async () => {
      await pool.query(`UPDATE warehouse_sections SET isactive = false WHERE id = $1`, [id]);
      return NextResponse.json({ success: true });
    });
  } catch (error) {
    console.error("Error deleting storage location:", error);
    return NextResponse.json({ error: "Failed to delete storage location" }, { status: 500 });
  }
}
