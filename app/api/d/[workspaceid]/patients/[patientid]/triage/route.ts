import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHREHRBySubjectId } from "@/lib/openehr/openehr";
import { createTriageComposition } from "@/lib/openehr/triage";
import { createVitalSignsComposition } from "@/lib/openehr/vitals";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/triage
 * Save a triage record as an openEHR composition using the template_triage_v1 template.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;
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

    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      triageLevel,
      esi,
      chiefComplaint,
      allergies,
      arrivalMode,
      notes,
      pain,
      medsGiven,
      procedures,
      vitals,
    } = body;

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json(
        { error: "No EHR found for this patient" },
        { status: 404 }
      );
    }

    const triageCompositionUid = await createTriageComposition(
      ehrId,
      {
        patientId: patientid,
        triageLevel,
        esi,
        chiefComplaint,
        allergies,
        arrivalMode,
        notes,
        pain,
        medsGiven,
        procedures,
      },
      user.name || "Unknown"
    );

    let vitalsCompositionUid: string | undefined;
    const hasVitals =
      vitals &&
      (vitals.temperature ||
        vitals.systolic ||
        vitals.diastolic ||
        vitals.heartRate ||
        vitals.respiratoryRate ||
        vitals.spO2);

    if (hasVitals) {
      vitalsCompositionUid = await createVitalSignsComposition(
        ehrId,
        {
          temperature: vitals.temperature || "",
          systolic: vitals.systolic || "",
          diastolic: vitals.diastolic || "",
          heartRate: vitals.heartRate || "",
          respiratoryRate: vitals.respiratoryRate || "",
          spO2: vitals.spO2 || "",
        },
        user.name || "Unknown"
      );
    }

    return NextResponse.json(
      {
        success: true,
        triage_composition_uid: triageCompositionUid,
        vitals_composition_uid: vitalsCompositionUid,
        message: "Triage and vitals saved to openEHR",
      },
      { status: 201 }
    );
    });
  } catch (error) {
    console.error("Error saving triage record:", error);
    return NextResponse.json(
      {
        error: "Failed to save triage record",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
