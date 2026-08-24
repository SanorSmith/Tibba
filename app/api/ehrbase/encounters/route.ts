import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import { listClinicalEncounters } from "@/lib/openehr/encounter";
import { getUser } from "@/lib/user";

/**
 * GET /api/ehrbase/encounters?ehrId=xxx
 * List all clinical encounters for a specific EHR
 * Returns composition_uid, composition_name, and start_time for each encounter
 */
export async function GET(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isAdmin = await checkIsAdmin();

    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ehrId = searchParams.get("ehrId");

    if (!ehrId) {
      return NextResponse.json(
        { error: "ehrId query parameter is required" },
        { status: 400 }
      );
    }

    const encounters = await listClinicalEncounters(ehrId);

    return NextResponse.json({
      success: true,
      encounters,
      count: encounters.length,
    });
  } catch (error) {
    console.error("Error listing clinical encounters:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
