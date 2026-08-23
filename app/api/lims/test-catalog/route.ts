/**
 * Test Catalog API Route
 * GET /api/lims/test-catalog
 * 
 * Returns active tests from the lab test catalog
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTestCatalog } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceid");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID required" }, { status: 400 });
    }

    // Fetch active tests for workspace
    const tests = await db
      .select()
      .from(labTestCatalog)
      .where(
        and(
          eq(labTestCatalog.workspaceid, workspaceId),
          eq(labTestCatalog.isactive, true)
        )
      )
      .orderBy(labTestCatalog.testcategory, labTestCatalog.testname);

    return NextResponse.json({
      tests,
      total: tests.length,
    });
  } catch (error) {
    console.error("Error fetching test catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch test catalog" },
      { status: 500 }
    );
  }
}
