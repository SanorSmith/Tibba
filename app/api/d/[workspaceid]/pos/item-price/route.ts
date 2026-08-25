import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const { drugName } = await request.json();
    
    if (!drugName) {
      return NextResponse.json({ error: "Drug name is required" }, { status: 400 });
    }

    // Direct database connection: drugs.name → items.name → item_batches.selling_price
    const query = sql`
      SELECT ib.selling_price as price
      FROM items i
      JOIN item_batches ib ON ib.item_id = i.id
      WHERE i.name = ${drugName}
        AND ib.selling_price IS NOT NULL
      ORDER BY ib.created_at DESC
      LIMIT 1
    `;

    const result = await db.execute(query);
    
    if (result.length > 0) {
      const price = parseFloat(result[0].price as string);
      return NextResponse.json({ 
        price,
        drugName,
        source: "item_batches.selling_price"
      });
    } else {
      return NextResponse.json({ 
        price: 0,
        drugName,
        source: "not_found"
      });
    }

    });
  } catch (error) {
    console.error("[Item Price POST]", error);
    return NextResponse.json({ error: "Failed to fetch item price" }, { status: 500 });
  }
}
