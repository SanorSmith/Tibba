/**
 * API: /api/d/[workspaceid]/emergency-doctors/assign
 * - POST: assign a doctor to an emergency visit
 * - Role: nurse, doctor, administrator
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emergencyDoctorAssignments } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { eq } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  const { workspaceid } = await params;

  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const role = membership?.role;

  if (!role || (role !== "nurse" && role !== "doctor" && role !== "administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { visitId, patientId, doctorId } = body;

    if (!visitId || !patientId || !doctorId) {
      return NextResponse.json(
        { error: "visitId, patientId, and doctorId are required" },
        { status: 400 }
      );
    }

    // Remove any existing assignment for this visit and create the new one
    await db
      .delete(emergencyDoctorAssignments)
      .where(eq(emergencyDoctorAssignments.visitid, String(visitId)));

    const [assignment] = await db
      .insert(emergencyDoctorAssignments)
      .values({
        workspaceid,
        visitid: String(visitId),
        patientid: String(patientId),
        doctorid: String(doctorId),
        assignedby: user.userid,
      })
      .returning();

    return NextResponse.json({ assignment });
  } catch (e) {
    console.error("[emergency-doctors][assign][POST] error:", e);
    return NextResponse.json({ error: "Failed to assign doctor" }, { status: 500 });
  }
}
