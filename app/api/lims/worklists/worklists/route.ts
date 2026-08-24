/**
 * Worklists API Route
 * Provides CRUD operations for worklists
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { worklists } from "@/lib/db/schema";
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

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const whereConditions: any[] = [eq(worklists.workspaceid, workspaceid)];

    if (status) {
      whereConditions.push(eq(worklists.status, status));
    }

    const worklistsData = await db
      .select()
      .from(worklists)
      .where(and(...whereConditions))
      .orderBy(desc(worklists.createdat));

    return NextResponse.json({ worklists: worklistsData });
    });
  } catch (error) {
    console.error("Error fetching worklists:", error);
    return NextResponse.json(
      { error: "Failed to fetch worklists" },
      { status: 500 }
    );
  }
}
