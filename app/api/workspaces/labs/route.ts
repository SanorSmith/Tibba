/**
 * GET /api/workspaces/labs
 * Lists active laboratory workspaces so ordering clinicians can pick which
 * lab facility a test order should be routed to.
 */
import { NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { and, or, eq, ilike } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const labs = await db
      .select({
        workspaceid: workspaces.workspaceid,
        name: workspaces.name,
      })
      .from(workspaces)
      .where(
        and(
          or(
            ilike(workspaces.type, "laboratory"),
            ilike(workspaces.type, "lab")
          ),
          eq(workspaces.isactive, true)
        )
      )
      .orderBy(workspaces.name);

    return NextResponse.json({ labs });
  } catch (error) {
    console.error("Error fetching lab workspaces:", error);
    return NextResponse.json({ error: "Failed to fetch labs" }, { status: 500 });
  }
}
