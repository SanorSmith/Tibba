/**
 * Finance — Bank & Cash Accounts API
 *
 * GET  /api/d/[workspaceid]/finance/bank-accounts — List bank accounts
 * POST /api/d/[workspaceid]/finance/bank-accounts — Create bank account
 */
import { NextRequest, NextResponse } from "next/server";
import { requireFinancePermission } from "@/lib/finance/permissions";
import { CreateBankAccountSchema } from "@/lib/finance/validation";
import { handleFinanceApiError } from "@/lib/finance/errors";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import {
  listBankAccounts,
  createBankAccount,
} from "@/lib/finance/services/bank-service";

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
    const auth = await requireFinancePermission(workspaceid, "finance:bank:read");
    if (auth instanceof NextResponse) return auth;

    const accounts = await listBankAccounts(workspaceid);
    return NextResponse.json({ accounts });
    });
  } catch (error) {
    return handleFinanceApiError(error, "GET /finance/bank-accounts");
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
    const auth = await requireFinancePermission(workspaceid, "finance:bank:write");
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const validated = CreateBankAccountSchema.parse(body);
    const account = await createBankAccount(workspaceid, validated);

    return NextResponse.json({ account }, { status: 201 });
    });
  } catch (error) {
    return handleFinanceApiError(error, "POST /finance/bank-accounts");
  }
}
