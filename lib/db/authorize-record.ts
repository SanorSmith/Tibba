/**
 * Authorises a request that arrives with a record id and no facility.
 *
 * Several routes are reached as `/api/warehouses/<id>` — the path carries the
 * record, never the workspace. Answering "may this user touch it?" takes three
 * steps that are easy to get subtly wrong, so they live here once:
 *
 *   1. is anyone signed in;
 *   2. which facility owns that id — via `app_owner_workspace`, because
 *      reading the row to find out would itself need a facility;
 *   3. does the signed-in user belong to it.
 *
 * Only then is the facility safe to hand to `withTenant`. Taking a workspace
 * id straight off the request instead would let the caller pick the answer to
 * step 3, which is the decision row-level security exists to make.
 *
 * A missing record and a record in someone else's facility both come back as
 * 404. Distinguishing them would confirm that an id exists, which is exactly
 * what the caller is not entitled to know.
 */
import { NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { ownerWorkspaceOf, type OwnedRecord } from "@/lib/db/owner-workspace";

type Authorized = { workspaceid: string; userid: string; error?: never };
type Refused = { error: NextResponse; workspaceid?: never; userid?: never };

export async function authorizeRecord(
  kind: OwnedRecord,
  id: string | null | undefined,
): Promise<Authorized | Refused> {
  const user = await getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!id) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  const workspaceid = await ownerWorkspaceOf(kind, id);
  if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }

  return { workspaceid, userid: user.userid };
}
