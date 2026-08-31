/**
 * Pharmacy Procurement Items Search API
 * GET — search items from the shared items table for procurement
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq, or, and, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const like = `%${search}%`;

    // What a pharmacy may put on a purchase order.
    //
    // This searched `items` alone - the facility's own catalogue - which is
    // backwards for procurement: ordering is how a medicine you do not stock
    // becomes one you do. Ali Pharma had exactly one item, so its order form
    // could offer one thing, while the national catalogue sat unread with
    // 4,274 entries. Every pharmacy now searches both, and behaves the same
    // way whether it holds one item or a thousand.
    //
    // Matching was also `term%`, so a word had to begin the name. "paracetamol"
    // found 38 of the catalogue's 50, missing every compound that carries it
    // in the middle - "Chlorpheniramine maleate 2mg+Paracetamol" among them.
    // It matches anywhere in the name now.
    //
    // Stocked items come first and are marked `source: "item"`; catalogue
    // entries the facility does not yet stock follow as `source: "catalogue"`,
    // carrying the global drug id. Adding one of those to an order creates its
    // items row at that point - see the orders route - so the foreign key on
    // pharmacy_purchase_order_items.item_id is always satisfied.
    const rows = await db.execute(sql`
      (
        SELECT i.id::text        AS itemid,
               NULL::text        AS globaldrugid,
               i.name            AS name,
               i.generic_name    AS genericname,
               i.item_code       AS itemcode,
               i.uom             AS uom,
               i.manufacturer    AS manufacturer,
               i.is_active       AS isactive,
               i.inventory_category::text AS inventorycategory,
               'item'            AS source
          FROM items i
         WHERE i.workspace_id = ${workspaceid}
           AND (${search} = '' OR i.name ILIKE ${like}
                OR i.item_code ILIKE ${like} OR i.generic_name ILIKE ${like})
         ORDER BY i.name
         LIMIT 50
      )
      UNION ALL
      (
        SELECT NULL::text        AS itemid,
               gd.drugid::text   AS globaldrugid,
               gd.name           AS name,
               gd.genericname    AS genericname,
               COALESCE(gd.nationalcode, '') AS itemcode,
               COALESCE(NULLIF(gd.unit, ''), 'unit') AS uom,
               NULL::text        AS manufacturer,
               true              AS isactive,
               'pharmacy'        AS inventorycategory,
               'catalogue'       AS source
          FROM global_drugs gd
         WHERE gd.isactive = true
           AND ${search} <> ''
           AND (gd.name ILIKE ${like} OR gd.genericname ILIKE ${like})
           -- not already on the facility's own shelf under the same name
           AND NOT EXISTS (
             SELECT 1 FROM items i2
              WHERE i2.workspace_id = ${workspaceid}
                AND lower(trim(i2.name)) = lower(trim(gd.name))
           )
         ORDER BY gd.name
         LIMIT 50
      )
    `);

    return NextResponse.json(rows);
    });
  } catch (error: any) {
    console.error('[Procurement Items API] Error:', error);
    return NextResponse.json({ error: error.message || "Failed to fetch items" }, { status: 500 });
  }
}
