import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET() {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Running migration 0033: Drop FK constraint on pos_sale_items.batchid");
    
    await db.execute(sql`
      ALTER TABLE pos_sale_items DROP CONSTRAINT IF EXISTS pos_sale_items_batchid_drug_batches_batchid_fk
    `);
    
    console.log("✓ Migration completed successfully");
    return NextResponse.json({ success: true, message: "Migration completed successfully" });
  } catch (error) {
    console.error("✗ Migration failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
