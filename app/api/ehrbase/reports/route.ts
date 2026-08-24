import { NextRequest, NextResponse } from "next/server";
import { checkIsAdmin } from "@/lib/db/queries/admin/shared";
import { getUser } from "@/lib/user";
import {
  listLaboratoryReports,
} from "@/lib/openehr/laboratory";

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

    const reports = await listLaboratoryReports(ehrId);

    return NextResponse.json({
      success: true,
      reports: reports,
    });
  } catch (error) {
    console.error("Error fetching laboratory report:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
