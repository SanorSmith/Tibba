/**
 * Insurance Companies API
 *
 * GET /api/d/[workspaceid]/insurance-companies
 *
 * Returns the active insurance companies from the Finance-managed master
 * list ("insurance_companies"). This list is shared across all workspaces —
 * Finance decides which insurance companies are available in the system.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCompanies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const companies = await db
      .select()
      .from(insuranceCompanies)
      .where(eq(insuranceCompanies.isactive, true))
      .orderBy(insuranceCompanies.name);

    return NextResponse.json({ companies });
    });
  } catch (error) {
    console.error("[Insurance Companies GET]", error);
    return NextResponse.json({ error: "Failed to fetch insurance companies" }, { status: 500 });
  }
}
