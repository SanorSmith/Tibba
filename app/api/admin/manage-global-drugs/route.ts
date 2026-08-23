/**
 * Admin API: Manage global drugs
 * GET - List all global drugs with duplicates
 * DELETE - Delete specific drugids from global_drugs
 * PATCH - Rename a drug in global_drugs
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { globalDrugs } from "@/lib/db/schema";
import { sql, inArray } from "drizzle-orm";
import { getUser } from "@/lib/user";

// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get total count
    const totalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM global_drugs
    `);

    // Get all global drugs, grouped by name to show duplicates
    const allDrugs = await db.execute(sql`
      SELECT 
        gd.drugid,
        gd.name,
        gd.genericname,
        gd.strength,
        gd.form,
        gd.atccode,
        gd.createdat,
        (
          SELECT COUNT(*) 
          FROM global_drugs gd2 
          WHERE gd2.name = gd.name 
            AND gd2.strength = gd.strength 
            AND gd2.form = gd.form
        ) as duplicate_count
      FROM global_drugs gd
      ORDER BY gd.name, gd.strength, gd.form, gd.createdat
    `);

    const total = (totalCount[0] as any)?.total || 0;
    const duplicateCount = allDrugs.filter((d: any) => d.duplicate_count > 1).length;

    return NextResponse.json({
      drugs: allDrugs,
      total: total,
      duplicateCount: duplicateCount,
      message: `Found ${total} global drugs (${duplicateCount} with duplicates)`
    });
  } catch (error) {
    console.error("Error fetching global drugs:", error);
    return NextResponse.json(
      { error: "Failed to fetch global drugs" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { drugids } = await request.json();
    
    if (!drugids || !Array.isArray(drugids) || drugids.length === 0) {
      return NextResponse.json(
        { error: "drugids array is required" },
        { status: 400 }
      );
    }

    // Delete the specified drugids
    await db
      .delete(globalDrugs)
      .where(inArray(globalDrugs.drugid, drugids));

    return NextResponse.json({
      success: true,
      deletedCount: drugids.length,
      message: `Deleted ${drugids.length} global drug records`
    });
  } catch (error) {
    console.error("Error deleting global drugs:", error);
    return NextResponse.json(
      { error: "Failed to delete global drugs" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { drugid, name, strength, form, unit, route } = await request.json();
    
    if (!drugid) {
      return NextResponse.json(
        { error: "drugid is required" },
        { status: 400 }
      );
    }

    // Update the drug
    await db.execute(sql`
      UPDATE global_drugs 
      SET 
        name = COALESCE(${name}, name),
        strength = COALESCE(${strength}, strength),
        form = COALESCE(${form}, form),
        unit = COALESCE(${unit}, unit),
        route = COALESCE(${route}, route),
        updatedat = NOW()
      WHERE drugid = ${drugid}::uuid
    `);

    return NextResponse.json({
      success: true,
      message: `Updated global drug ${drugid}`
    });
  } catch (error) {
    console.error("Error updating global drug:", error);
    return NextResponse.json(
      { error: "Failed to update global drug" },
      { status: 500 }
    );
  }
}
