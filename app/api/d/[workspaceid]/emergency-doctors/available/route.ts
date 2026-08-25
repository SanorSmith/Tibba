/**
 * API: /api/d/[workspaceid]/emergency-doctors/available
 * - GET: list available emergency doctors for the workspace
 * - Role: nurse, doctor, administrator
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  emergencyDoctorAvailability,
  users,
  workspaceusers,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Signed in is not the same as belonging here: without this, one
  // facility's data is reachable by changing the id in the request.
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Runs with this facility's identity on the connection, so row-level
  // security scopes every query below in the database itself.
  return await withTenant(workspaceid, async () => {

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;

  if (!role || (role !== "nurse" && role !== "doctor" && role !== "administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await db
      .select({
        availabilityid: emergencyDoctorAvailability.availabilityid,
        doctorid: emergencyDoctorAvailability.doctorid,
        name: users.name,
        email: users.email,
        isavailable: emergencyDoctorAvailability.isavailable,
        shiftstart: emergencyDoctorAvailability.shiftstart,
        shiftend: emergencyDoctorAvailability.shiftend,
        updatedat: emergencyDoctorAvailability.updatedat,
      })
      .from(emergencyDoctorAvailability)
      .innerJoin(users, eq(emergencyDoctorAvailability.doctorid, users.userid))
      .innerJoin(
        workspaceusers,
        and(
          eq(workspaceusers.workspaceid, workspaceid),
          eq(workspaceusers.userid, emergencyDoctorAvailability.doctorid),
          eq(workspaceusers.role, "doctor")
        )
      )
      .where(
        and(
          eq(emergencyDoctorAvailability.workspaceid, workspaceid),
          eq(emergencyDoctorAvailability.isavailable, true)
        )
      )
      .orderBy(desc(emergencyDoctorAvailability.updatedat));

    return NextResponse.json({ doctors: rows });
  } catch (e) {
    console.error("[emergency-doctors][available][GET] error:", e);
    return NextResponse.json({ error: "Failed to load available doctors" }, { status: 500 });
  }
  });
}
