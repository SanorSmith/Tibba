/**
 * Admin API: Manage workspace drugs
 * GET - List all workspace drugs with duplicates
 * DELETE - Delete specific drugids from drugs table
 * PATCH - Rename a drug in drugs table
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs } from "@/lib/db/schema";
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

    // Get total count and unique names count
    const totalCount = await db.execute(sql`
      SELECT COUNT(*) as total FROM drugs
    `);
    
    const uniqueNamesCount = await db.execute(sql`
      SELECT COUNT(DISTINCT name) as unique_names FROM drugs
    `);
    
    const workspaceCount = await db.execute(sql`
      SELECT COUNT(DISTINCT workspaceid) as workspace_count FROM drugs
    `);
    
    // Get breakdown by workspace
    const workspaceBreakdown = await db.execute(sql`
      SELECT 
        d.workspaceid,
        COUNT(*) as drug_count,
        COUNT(DISTINCT d.name) as unique_names
      FROM drugs d
      GROUP BY d.workspaceid
      ORDER BY drug_count DESC
    `);

    // Get all workspace drugs, grouped by name to show duplicates
    const allDrugs = await db.execute(sql`
      SELECT 
        d.drugid,
        d.workspaceid,
        d.name,
        d.genericname,
        d.strength,
        d.form,
        d.atccode,
        d.createdat,
        (
          SELECT COUNT(*) 
          FROM drugs d2 
          WHERE d2.name = d.name 
            AND d2.strength = d.strength 
            AND d2.form = d.form
            AND d2.workspaceid = d.workspaceid
        ) as duplicate_count
      FROM drugs d
      ORDER BY d.name, d.strength, d.form, d.createdat
    `);

    const total = (totalCount[0] as any)?.total || 0;
    const uniqueNames = (uniqueNamesCount[0] as any)?.unique_names || 0;
    const workspaces = (workspaceCount[0] as any)?.workspace_count || 0;
    const duplicateCount = allDrugs.filter((d: any) => d.duplicate_count > 1).length;

    return NextResponse.json({
      drugs: allDrugs,
      total: total,
      uniqueNames: uniqueNames,
      workspaceCount: workspaces,
      duplicateCount: duplicateCount,
      workspaceBreakdown: workspaceBreakdown,
      message: `Found ${total} workspace drugs (${uniqueNames} unique names, ${workspaces} workspaces, ${duplicateCount} with duplicates)`
    });
  } catch (error) {
    console.error("Error fetching workspace drugs:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace drugs" },
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
      .delete(drugs)
      .where(inArray(drugs.drugid, drugids));

    return NextResponse.json({
      success: true,
      deletedCount: drugids.length,
      message: `Deleted ${drugids.length} workspace drug records`
    });
  } catch (error) {
    console.error("Error deleting workspace drugs:", error);
    return NextResponse.json(
      { error: "Failed to delete workspace drugs" },
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
      UPDATE drugs 
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
      message: `Updated workspace drug ${drugid}`
    });
  } catch (error) {
    console.error("Error updating workspace drug:", error);
    return NextResponse.json(
      { error: "Failed to update workspace drug" },
      { status: 500 }
    );
  }
}
