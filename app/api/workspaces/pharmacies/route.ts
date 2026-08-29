/**
 * GET /api/workspaces/pharmacies
 *
 * Lists the pharmacies a prescriber can send a prescription to.
 *
 * Deliberately unscoped, for the same reason as /api/workspaces/labs: a doctor
 * choosing where to send a prescription has to see pharmacies other than their
 * own. Migration 0068 opens SELECT on `workspaces` for exactly this, and the
 * query returns names and ids only — no clinical or financial data crosses a
 * facility boundary here.
 *
 * `hospital` is included alongside the pharmacy types because a hospital
 * dispenses its own prescriptions; Alis is one, and it is where every
 * prescription written so far has been filed.
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

    const pharmacies = await db
      .select({
        workspaceid: workspaces.workspaceid,
        name: workspaces.name,
        type: workspaces.type,
      })
      .from(workspaces)
      .where(
        and(
          or(
            ilike(workspaces.type, "pharmacy"),
            ilike(workspaces.type, "hospital"),
          ),
          eq(workspaces.isactive, true),
        ),
      )
      .orderBy(workspaces.name);

    return NextResponse.json({ pharmacies });
  } catch (error) {
    console.error("Error fetching pharmacy workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch pharmacies" },
      { status: 500 },
    );
  }
}
