/**
 * The facility's own details: name, licence number, telephone, address.
 *
 * These are printed on receipts and dispensing records, so they are read by
 * any member of the facility and written only by its administrators. The
 * receipt previously carried a licence number hardcoded in the component,
 * which meant every facility asserted the same one; migration 0084 gave these
 * somewhere real to live and this is how a facility maintains them.
 *
 * Writes are scoped by row-level security to the facility's own row
 * (`tenant_update` matches workspaceid against app.workspace_id), so even a
 * mistake here cannot rename someone else's pharmacy.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

const selection = {
  workspaceid: workspaces.workspaceid,
  name: workspaces.name,
  type: workspaces.type,
  licensenumber: workspaces.licensenumber,
  phone: workspaces.phone,
  address: workspaces.address,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return await withTenant(workspaceid, async () => {
    const [facility] = await db
      .select(selection)
      .from(workspaces)
      .where(eq(workspaces.workspaceid, workspaceid))
      .limit(1);

    if (!facility) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ facility });
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const { workspaceid } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Reading a licence number is every member's business; setting one is not.
  const memberships = await getUserWorkspaces(user.userid);
  const role = memberships.find(
    (w) => w.workspace.workspaceid === workspaceid,
  )?.role;
  if (role !== "administrator") {
    return NextResponse.json(
      { error: "Only a workspace administrator can change facility details" },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Blank means "not recorded", which is a real answer and prints as nothing.
  // Trimming first stops a stray space from becoming a value.
  const clean = (v: unknown): string | null | undefined => {
    if (v === undefined) return undefined;
    if (v === null) return null;
    const s = String(v).trim();
    return s === "" ? null : s;
  };

  const updates: Record<string, string | null> = {};
  for (const field of ["licensenumber", "phone", "address"] as const) {
    const value = clean(body[field]);
    if (value !== undefined) updates[field] = value;
  }

  // The name is the facility's identity elsewhere in the system, so it is
  // editable here but never blankable.
  const name = clean(body.name);
  if (name !== undefined) {
    if (name === null) {
      return NextResponse.json(
        { error: "Facility name cannot be empty" },
        { status: 400 },
      );
    }
    updates.name = name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  return await withTenant(workspaceid, async () => {
    const [facility] = await db
      .update(workspaces)
      .set({ ...updates, updatedat: new Date() })
      .where(eq(workspaces.workspaceid, workspaceid))
      .returning(selection);

    // Row-level security refuses rather than misfiles, so no row back means
    // the write was not permitted - worth saying out loud instead of
    // reporting a success that did not happen.
    if (!facility) {
      return NextResponse.json(
        { error: "Facility details could not be updated" },
        { status: 500 },
      );
    }
    return NextResponse.json({ facility });
  });
}
