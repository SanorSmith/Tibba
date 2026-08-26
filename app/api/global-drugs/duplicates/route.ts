import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { pool } from "@/lib/db/pool";
import { withoutTenant } from "@/lib/db/tenant";


export async function GET(req: NextRequest) {
  try {
    // No tenant: global_drugs is national reference data belonging to no
    // facility (docs/tenant-isolation-open-tables.md). Marked rather than
    // merely absent, so a future audit can tell this apart from an oversight.
    return await withoutTenant("global_drugs is shared reference data", async () => {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT 
        name,
        form,
        strength,
        nationalcode,
        COUNT(*) as drug_count,
        array_agg(drugid) as drug_ids
      FROM global_drugs
      GROUP BY name, form, strength, nationalcode
      HAVING COUNT(*) > 1
      ORDER BY drug_count DESC, name`
    );

    // Also check for NDL code duplicates
    const ndlResult = await pool.query(
      `SELECT 
        nationalcode,
        COUNT(*) as drug_count,
        array_agg(drugid) as drug_ids,
        array_agg(name) as names
      FROM global_drugs
      WHERE nationalcode IS NOT NULL AND nationalcode != ''
      GROUP BY nationalcode
      HAVING COUNT(*) > 1
      ORDER BY drug_count DESC`
    );

    return NextResponse.json({ 
      duplicates: result.rows,
      ndlDuplicates: ndlResult.rows
    });
    });
  } catch (error) {
    console.error('[Global Drugs Duplicates] Error:', error);
    return NextResponse.json({ error: "Failed to fetch duplicates" }, { status: 500 });
  }
}
