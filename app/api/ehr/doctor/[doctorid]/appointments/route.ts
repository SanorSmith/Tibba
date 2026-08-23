import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { appointments, patients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ workspaceid: string; doctorid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, doctorid } = await context.params;
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    // Fetch appointments for this doctor
    const doctorAppointments = await db
      .select({
        appointment: appointments,
        patient: patients,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientid, patients.patientid))
      .where(
        and(
          eq(appointments.workspaceid, workspaceid),
          eq(appointments.doctorid, doctorid)
        )
      )
      .orderBy(desc(appointments.starttime));

    // Format the response
    const formattedAppointments = doctorAppointments.map((row) => ({
      ...row.appointment,
      patient: row.patient
        ? {
            firstname: row.patient.firstname,
            middlename: row.patient.middlename,
            lastname: row.patient.lastname,
            nationalid: row.patient.nationalid,
          }
        : null,
    }));

    return NextResponse.json({
      appointments: formattedAppointments,
    });
    });
  } catch (error) {
    console.error("Error fetching doctor appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
