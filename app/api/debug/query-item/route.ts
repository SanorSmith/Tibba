import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  // This route answered anyone who could reach it. There is no facility
  // in scope to check membership against, so this closes what can be
  // closed here: it now requires a signed-in user.
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const itemId = searchParams.get("itemId");
  
  if (!itemId) {
    return NextResponse.json({ error: "itemId parameter required" }, { status: 400 });
  }
  
  try {
    const result = await db.execute(sql`
      SELECT 
        i.id,
        i.name,
        i.drug_id,
        i.item_type,
        i.manufacturer,
        ist.quantity,
        ist.reserved_quantity,
        ist.batch_id,
        ib.lot_number,
        ib.expiry_date
      FROM inventory_stock ist
      JOIN items i ON i.id = ist.item_id
      LEFT JOIN item_batches ib ON ib.id = ist.batch_id
      WHERE ist.item_id = ${itemId}
    `);
    
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }
}
