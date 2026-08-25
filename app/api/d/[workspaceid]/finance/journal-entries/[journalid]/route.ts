/**
 * Finance — Single Journal Entry API
 *
 * GET /api/d/[workspaceid]/finance/journal-entries/[journalid]
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { getJournalWithLines } from "@/lib/finance/services/journal-service";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

type RouteParams = {
  params: Promise<{ workspaceid: string; journalid: string }>;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { workspaceid, journalid } = await params;

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
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:journal:read"
    );
    if (auth instanceof NextResponse) return auth;

    const journal = await getJournalWithLines(workspaceid, journalid);
    if (!journal) {
      return NextResponse.json(
        { error: "Journal entry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ journal });
    });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/journal-entries/[id]");
  }
}
