/**
 * GET /api/d/[workspaceid]/drugs/autocomplete
 *
 * What a prescriber may search for.
 *
 * This used to search only the facility's own pharmacy inventory, and only
 * items with stock on hand. That left a doctor at Hospital 1 with 15
 * medicines to choose from, and doctors at three facilities with none at all,
 * while the national catalogue sat unread with 4,274 entries.
 *
 * It also stopped making sense once a prescription could be routed: a doctor
 * can now send one to a pharmacy that stocks 1,096 items, so limiting the
 * search to what is on their own shelf hides most of what can be dispensed.
 * Clinically the two are different questions anyway - a doctor prescribes a
 * medicine, and whether a given branch holds it is a dispensing concern.
 *
 * So the search is the national catalogue, and local stock is reported
 * alongside each result rather than used to filter it. `inStock` and
 * `stockQuantity` let the form show what is available here without
 * preventing anything else from being prescribed.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { drugs, globalDrugs, items, warehouseSections } from "@/lib/db/schema";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return NextResponse.json({ drugs: [] });
    }

    // The national catalogue is the search space. Local inventory is joined
    // only to report availability, so a medicine this facility does not stock
    // still appears and can still be prescribed.
    const results = await db.execute(sql`
      SELECT
        gd.drugid                                   AS drugid,
        i.id                                        AS itemid,
        gd.name                                     AS name,
        gd.genericname                              AS genericname,
        COALESCE(gd.form, '')                       AS form,
        NULLIF(gd.strength, '')                     AS strength,
        COALESCE(gd.unit, '')                       AS unit,
        COALESCE(gd.route, '')                      AS route,
        COALESCE(gd.atccode, '')                    AS atccode,
        COALESCE(gd.category, '')                   AS category,
        COALESCE(gd.interaction, '')                AS interaction,
        COALESCE(gd.warning, '')                    AS warning,
        COALESCE(gd.nationalcode, '')               AS nationalcode,
        i.barcode                                   AS barcode,
        i.manufacturer                              AS manufacturer,
        false                                       AS insuranceapproved,
        i.storage_location_id                       AS "storageLocationId",
        ws.sectionname                              AS "storageLocationName",
        ws.bin_location                             AS "storageLocation",
        ws.section_type                             AS "storageType",
        ws.shelf                                    AS shelf,
        COALESCE(st.qty, 0) > 0                     AS "inStock",
        COALESCE(st.qty, 0)::int                    AS "stockQuantity"
      FROM global_drugs gd
      -- items.drug_id points at the per-facility drugs table, never at the
      -- catalogue: 4,320 of 4,810 match a local drug row and 0 match a
      -- global_drugs id. (The join this replaced compared gd.drugid to
      -- i.drug_id and so matched nothing, which is why every COALESCE onto
      -- catalogue data was silently falling through to the local row.)
      -- Name is the only link between the two, so stock is reported through
      -- it. Imperfect - 3,244 of 7,184 local drugs match a catalogue name -
      -- but it only decorates the result, never filters it.
      LEFT JOIN drugs ld
        ON lower(ld.name) = lower(gd.name)
       AND ld.workspaceid = ${workspaceid}
      LEFT JOIN items i
        ON i.drug_id = ld.drugid
       AND i.workspace_id = ${workspaceid}
       AND i.is_active = true
       AND i.inventory_category = 'pharmacy'
      LEFT JOIN warehouse_sections ws ON ws.id = i.storage_location_id
      LEFT JOIN LATERAL (
        SELECT SUM(ist.quantity) AS qty FROM inventory_stock ist WHERE ist.item_id = i.id
      ) st ON true
      WHERE gd.isactive = true
        AND (gd.name ILIKE ${'%' + query + '%'} OR gd.genericname ILIKE ${'%' + query + '%'})
      -- what is on the shelf here first, then alphabetically
      ORDER BY (COALESCE(st.qty, 0) > 0) DESC, gd.name
      LIMIT 15
    `);

    // Ensure all fields are properly serialized
    const sanitizedResults = results.map(drug => ({
      ...drug,
      genericname: drug.genericname || null,
      form: drug.form || null,
      strength: drug.strength || null,
      unit: drug.unit || null,
      route: drug.route || null,
      atccode: drug.atccode || null,
      category: drug.category || null,
      interaction: drug.interaction || null,
      warning: drug.warning || null,
      nationalcode: drug.nationalcode || null,
      barcode: drug.barcode || null,
      manufacturer: drug.manufacturer || null,
      insuranceapproved: drug.insuranceapproved || false,
      storageLocationId: drug.storageLocationId || null,
      storageLocationName: drug.storageLocationName || null,
      storageLocation: drug.storageLocation || null,
      storageType: drug.storageType || null,
      shelf: drug.shelf || null,
      inStock: drug.inStock ?? false,
      stockQuantity: drug.stockQuantity ?? 0,
    }));

    return NextResponse.json({ drugs: sanitizedResults });
    });
  } catch (error) {
    console.error("Error in drug autocomplete:", error);
    return NextResponse.json(
      { error: "Failed to search drugs" },
      { status: 500 }
    );
  }
}
