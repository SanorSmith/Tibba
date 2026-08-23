/**
 * Finance — Post Draft Journal to GL
 *
 * POST /api/d/[workspaceid]/finance/journal-entries/[journalid]/post
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { postDraftJournal } from "@/lib/finance/services/posting-engine";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

type RouteParams = {
  params: Promise<{ workspaceid: string; journalid: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
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

    return withTenant(workspaceid, async () => {
    const auth = await requireFinancePermission(
      workspaceid,
      "finance:journal:post"
    );
    if (auth instanceof NextResponse) return auth;

    const result = await postDraftJournal(
      workspaceid,
      journalid,
      auth.user.userid
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
    });
  } catch (error) {
    return handleFinanceApiError(
      error,
      "POST /finance/journal-entries/[id]/post"
    );
  }
}
