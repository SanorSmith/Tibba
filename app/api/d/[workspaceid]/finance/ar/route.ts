/**
 * Finance — Accounts Receivable API
 *
 * GET /api/d/[workspaceid]/finance/ar — List AR transactions
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { listArTransactions } from "@/lib/finance/services/ar-service";
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

    return withTenant(workspaceid, async () => {
    const auth = await requireFinancePermission(workspaceid, "finance:ar:read");
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const filters = {
      customertype: searchParams.get("customertype") || undefined,
      customerid: searchParams.get("customerid") || undefined,
      limit: searchParams.has("limit")
        ? parseInt(searchParams.get("limit")!, 10)
        : undefined,
      offset: searchParams.has("offset")
        ? parseInt(searchParams.get("offset")!, 10)
        : undefined,
    };

    const transactions = await listArTransactions(workspaceid, filters);
    return NextResponse.json({ transactions });
    });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/ar");
  }
}
