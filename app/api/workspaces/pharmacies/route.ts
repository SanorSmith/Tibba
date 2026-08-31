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
 * Pharmacy workspaces only. This first listed hospitals too, on the reasoning
 * that a hospital dispenses its own prescriptions — but no hospital here is a
 * pharmacy workspace, so sending an order to one files it where nothing can
 * dispense it. A hospital that wants to fill its own prescriptions needs a
 * pharmacy workspace of its own, and it will then appear here by name.
 */
import { NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { and, eq, ilike } from "drizzle-orm";

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
        and(ilike(workspaces.type, "pharmacy"), eq(workspaces.isactive, true)),
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
