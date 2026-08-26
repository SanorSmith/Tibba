/**
 * Establishes which facility a request is acting for, from the request itself.
 *
 * These routes predate the workspace-scoped API under `/api/d/[workspaceid]/`.
 * They are still live — the pharmacy inventory and dashboard pages call them —
 * but the facility arrives in a query parameter rather than the path, and the
 * callers spell it three different ways.
 *
 * Refusing with 400 when it is absent is deliberate. The alternative is to run
 * with no tenant, and under the restricted role that returns an empty result
 * rather than an error: the page renders, shows nothing, and reports no
 * problem. A missing parameter should look like a missing parameter.
 *
 * The id is proved against membership before it is used. An id taken from the
 * request and trusted would let the caller choose the answer to the question
 * row-level security exists to ask.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";

type Resolved = { workspaceid: string; userid: string; error?: never };
type Refused = { error: NextResponse; workspaceid?: never; userid?: never };

/** The spellings in use across the existing call sites. */
function workspaceFrom(req: NextRequest): string | null {
  const p = req.nextUrl.searchParams;
  return p.get("workspaceid") ?? p.get("workspaceId") ?? p.get("workspace_id");
}

export async function requireWorkspace(
  req: NextRequest,
  fromBody?: string | null,
): Promise<Resolved | Refused> {
  const user = await getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const workspaceid = fromBody ?? workspaceFrom(req);
  if (!workspaceid) {
    return {
      error: NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 },
      ),
    };
  }

  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { workspaceid, userid: user.userid };
}
