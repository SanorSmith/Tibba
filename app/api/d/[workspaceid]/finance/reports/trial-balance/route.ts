/**
 * Finance — Trial Balance Report
 *
 * GET /api/d/[workspaceid]/finance/reports/trial-balance?periodid=uuid
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { getTrialBalance } from "@/lib/finance/services/reports-service";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

type RouteParams = { params: Promise<{ workspaceid: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid } = await params;

    // This route had no authentication at all: the facility's data was
    // served to anyone who could type the URL. Who you are, whether you
    // belong here, and only then the data.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {
    const auth = await requireFinancePermission(workspaceid, "finance:reports:read");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const periodid = searchParams.get("periodid");

    if (!periodid) {
      return NextResponse.json(
        { error: "periodid query parameter is required" },
        { status: 400 }
      );
    }

    const report = await getTrialBalance(workspaceid, periodid);
    return NextResponse.json(report);
    });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/reports/trial-balance");
  }
}
