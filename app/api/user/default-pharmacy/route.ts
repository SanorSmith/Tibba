/**
 * GET / PUT /api/user/default-pharmacy?workspaceid=...
 *
 * The pharmacy a doctor usually sends prescriptions to, remembered on their
 * own profile so the "Send to" picker comes up on it instead of empty.
 *
 * Kept per prescribing facility rather than one value per user: a doctor who
 * works at two hospitals sends to whichever pharmacy is near each of them, and
 * one shared default would be wrong at the other. The shape is
 *
 *   users.preferences = { "defaultDispensingPharmacy": { "<facility>": "<pharmacy>" } }
 *
 * Written with raw SQL rather than through the drizzle table so that the
 * `preferences` column can be added to the schema after the migration runs,
 * not before — every other query on `users` selects an explicit column list,
 * and naming a column that does not exist yet would break all of them. Until
 * the migration runs this route reports "no default" and saving is a no-op,
 * which leaves the picker behaving exactly as it does today.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { and, eq, ilike, sql } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";

const PREFERENCE_KEY = "defaultDispensingPharmacy";

/** 42703 is undefined_column: the migration adding `preferences` has not run. */
function isMissingPreferencesColumn(error: unknown): boolean {
  return (error as { code?: string })?.code === "42703";
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceid = request.nextUrl.searchParams.get("workspaceid");
    if (!workspaceid) {
      return NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 },
      );
    }

    // The preference is about a facility, so it is readable only by someone
    // who belongs to that facility.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const rows = await db.execute(sql`
        SELECT preferences -> ${PREFERENCE_KEY} ->> ${workspaceid} AS pharmacy
          FROM users
         WHERE userid = ${user.userid}
      `);
      const pharmacyWorkspaceId =
        (rows[0] as { pharmacy?: string | null })?.pharmacy ?? null;
      return NextResponse.json({ pharmacyWorkspaceId });
    } catch (error) {
      if (isMissingPreferencesColumn(error)) {
        return NextResponse.json({ pharmacyWorkspaceId: null });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error reading default pharmacy:", error);
    return NextResponse.json(
      { error: "Failed to read default pharmacy" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const workspaceid: string | undefined = body.workspaceid;
    const pharmacyWorkspaceId: string | null = body.pharmacyWorkspaceId ?? null;

    if (!workspaceid) {
      return NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 },
      );
    }

    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The same rule the prescription itself is held to: a default that is not
    // a pharmacy would only preselect a destination the form then rejects.
    if (pharmacyWorkspaceId) {
      const [target] = await db
        .select({ workspaceid: workspaces.workspaceid })
        .from(workspaces)
        .where(
          and(
            eq(workspaces.workspaceid, pharmacyWorkspaceId),
            ilike(workspaces.type, "pharmacy"),
            eq(workspaces.isactive, true),
          ),
        )
        .limit(1);

      if (!target) {
        return NextResponse.json(
          { error: "Only an active pharmacy can be a default destination" },
          { status: 400 },
        );
      }
    }

    try {
      if (pharmacyWorkspaceId) {
        await db.execute(sql`
          UPDATE users
             SET preferences = jsonb_set(
                   COALESCE(preferences, '{}'::jsonb),
                   ARRAY[${PREFERENCE_KEY}, ${workspaceid}],
                   to_jsonb(${pharmacyWorkspaceId}::text),
                   true
                 )
           WHERE userid = ${user.userid}
        `);
      } else {
        // Clearing it is how a doctor goes back to choosing every time.
        await db.execute(sql`
          UPDATE users
             SET preferences = COALESCE(preferences, '{}'::jsonb)
                               #- ARRAY[${PREFERENCE_KEY}, ${workspaceid}]
           WHERE userid = ${user.userid}
        `);
      }
      return NextResponse.json({ success: true, pharmacyWorkspaceId });
    } catch (error) {
      if (isMissingPreferencesColumn(error)) {
        // Nothing to store yet. Say so plainly rather than reporting a save
        // that did not happen — the prescription itself was unaffected.
        return NextResponse.json(
          {
            success: false,
            error:
              "Preferences are not enabled yet: users.preferences is missing.",
          },
          { status: 501 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error saving default pharmacy:", error);
    return NextResponse.json(
      { error: "Failed to save default pharmacy" },
      { status: 500 },
    );
  }
}
