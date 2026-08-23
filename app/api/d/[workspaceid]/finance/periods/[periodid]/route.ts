/**
 * Finance — Single Period API
 *
 * GET /api/d/[workspaceid]/finance/periods/[periodid]
 * PUT /api/d/[workspaceid]/finance/periods/[periodid] — Close/Reopen
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import {
  getPeriodById,
  closePeriod,
  reopenPeriod,
} from "@/lib/finance/services/period-service";
import { z } from "zod";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

type RouteParams = {
  params: Promise<{ workspaceid: string; periodid: string }>;
};

const UpdatePeriodSchema = z.object({
  action: z.enum(["close", "reopen"]),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, periodid } = await params;

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
    const auth = await requireFinancePermission(workspaceid, "finance:periods:read");
    if (auth instanceof NextResponse) return auth;

    const period = await getPeriodById(workspaceid, periodid);
    if (!period) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 });
    }

    return NextResponse.json({ period });
    });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/periods/[id]");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, periodid } = await params;

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
    const auth = await requireFinancePermission(workspaceid, "finance:periods:close");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { action } = UpdatePeriodSchema.parse(body);

    let period;
    if (action === "close") {
      period = await closePeriod(workspaceid, periodid, auth.user.userid);
    } else {
      period = await reopenPeriod(workspaceid, periodid);
    }

    return NextResponse.json({ period });
    });
  } catch (error) {
    return handleFinanceApiError(error, "PUT /finance/periods/[id]");
  }
}
