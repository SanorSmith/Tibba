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
    return withTenant(workspaceid, async () => {

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    // Build search conditions - only items starting with the search term (case-insensitive)
    const searchConditions = search
      ? or(
          sql`${items.name} ILIKE ${search + '%'}`,
          sql`${items.itemcode} ILIKE ${search + '%'}`,
          sql`${items.genericname} ILIKE ${search + '%'}`
        )
      : undefined;

    // Simple query - just get items with basic fields needed for procurement
    const allItems = await db
      .select({
        itemid: items.id,
        name: items.name,
        genericname: items.genericname,
        itemcode: items.itemcode,
        uom: items.uom,
        manufacturer: items.manufacturer,
        isactive: items.isactive,
        inventorycategory: items.inventorycategory,
      })
      .from(items)
      .where(searchConditions ? and(eq(items.workspaceid, workspaceid), searchConditions) : eq(items.workspaceid, workspaceid))
      .orderBy(items.name)
      .limit(50);

    return NextResponse.json(allItems);
    });
  } catch (error: any) {
    console.error('[Procurement Items API] Error:', error);
    return NextResponse.json({ error: error.message || "Failed to fetch items" }, { status: 500 });
  }
}
