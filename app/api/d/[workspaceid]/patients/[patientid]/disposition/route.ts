import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { ensurePatientEHR } from "@/lib/openehr/ensure-ehr";
import { createDispositionComposition, getLatestDisposition, DispositionData } from "@/lib/openehr/disposition";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHRDiagnoses, getOpenEHREHRBySubjectId } from "@/lib/openehr/openehr";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/disposition
 * Create a patient disposition (admit/transfer/discharge) in openEHR
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;

    // Authenticate user
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
    return withTenant(workspaceid, async () => {

    // Verify workspace access
    const memberships = await getUserWorkspaces(user.userid);
    const membership = memberships.find((m) => m.workspace.workspaceid === workspaceid);
    if (!membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Parse request body
    const dispositionData: DispositionData = await request.json();

    // Validate required fields
    if (!dispositionData.type || !["admit", "transfer", "discharge"].includes(dispositionData.type)) {
      return NextResponse.json(
        { error: "Invalid disposition type. Must be 'admit', 'transfer', or 'discharge'" },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (dispositionData.type === "admit") {
      if (!dispositionData.ward || !dispositionData.bedNumber) {
        return NextResponse.json(
          { error: "Ward and bed number are required for admission" },
          { status: 400 }
        );
      }
    } else if (dispositionData.type === "transfer") {
      if (!dispositionData.transferTo) {
        return NextResponse.json(
          { error: "Transfer destination is required" },
          { status: 400 }
        );
      }
    } else if (dispositionData.type === "discharge") {
      if (!dispositionData.dischargeSummary) {
        return NextResponse.json(
          { error: "Discharge summary is required" },
          { status: 400 }
        );
      }
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Ensure EHR exists for patient
    const ehrId = await ensurePatientEHR(patientid);

    // Find EHR by National ID or use the one from ensurePatientEHR
    let actualEhrId: string | null = ehrId;
    if (patient.nationalid && !actualEhrId) {
      try {
        actualEhrId = await getOpenEHREHRBySubjectId(patient.nationalid);
      } catch (error) {
        console.error("Error finding EHR by National ID:", error);
      }
    }
    if (!actualEhrId) {
      actualEhrId = ehrId;
    }

    // Fetch emergency visit data if not already provided
    if (!dispositionData.emergencyVisitData) {
      try {
        // Build base URL from request
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const host = request.headers.get('host') || 'localhost:3000';
        const baseUrl = `${protocol}://${host}`;

        // Fetch triage data
        const triageResponse = await fetch(`${baseUrl}/api/d/${workspaceid}/triage`);
        const triageData = triageResponse.ok ? await triageResponse.json() : { records: [] };
        const patientTriage = (triageData.records || []).find((r: any) => r.patientId === patientid);

        // Fetch vitals
        const vitalsResponse = await fetch(`${baseUrl}/api/d/${workspaceid}/patients/${patientid}/vital-signs?limit=50`);
        const vitalsData = vitalsResponse.ok ? await vitalsResponse.json() : { vitalSigns: [] };

        // Fetch lab results
        const labResultsResponse = await fetch(`${baseUrl}/api/d/${workspaceid}/patients/${patientid}/lab-results`);
        const labResultsData = labResultsResponse.ok ? await labResultsResponse.json() : { labResults: [], imagingResults: [], ecgResults: [] };

        // Fetch lab orders
        const labOrdersResponse = await fetch(`${baseUrl}/api/d/${workspaceid}/patients/${patientid}/lab-orders`);
        const labOrdersData = labOrdersResponse.ok ? await labOrdersResponse.json() : { labOrders: [] };

        // Fetch diagnoses
        const diagnoses = actualEhrId ? await getOpenEHRDiagnoses(actualEhrId) : [];

        // Build emergency visit data
        dispositionData.emergencyVisitData = {
          triageLevel: patientTriage?.triageLevel,
          esi: patientTriage?.esi,
          chiefComplaint: patientTriage?.chiefComplaint,
          arrivalMode: patientTriage?.arrivalMode,
          arrivalTime: patientTriage?.arrivalTime,
          painScore: patientTriage?.painScore,
          allergies: patientTriage?.allergies,
          vitals: (vitalsData.vitalSigns || []).map((v: any) => ({
            temperature: v.temperature,
            systolic: v.systolic,
            diastolic: v.diastolic,
            heartRate: v.heart_rate,
            respiratoryRate: v.respiratory_rate,
            spO2: v.spo2,
            recordedTime: v.recorded_time,
          })),
          labResults: (labResultsData.labResults || []).map((r: any) => ({
            testName: r.test_name,
            reportDate: r.report_date,
            conclusion: r.conclusion,
            price: r.price,
          })),
          labOrders: (labOrdersData.labOrders || []).map((o: any) => ({
            serviceName: o.service_name,
            requestedDate: o.requested_date,
            urgency: o.urgency,
            status: o.request_status,
          })),
          imagingResults: (labResultsData.imagingResults || []).map((r: any) => ({
            studyName: r.study_name,
            reportDate: r.report_date,
            impression: r.impression,
            price: r.price,
          })),
          ecgResults: (labResultsData.ecgResults || []).map((r: any) => ({
            testName: r.test_name,
            reportDate: r.report_date,
            interpretation: r.interpretation,
            price: r.price,
          })),
          diagnoses: diagnoses.map((d: any) => ({
            problemDiagnosis: d.problem_diagnosis,
            clinicalStatus: d.clinical_status,
            recordedTime: d.recorded_time,
          })),
        };
      } catch (error) {
        console.error("Error fetching emergency visit data:", error);
        // Continue without emergency visit data if fetch fails
      }
    }

    // Add composer information
    dispositionData.composerName = user.name || user.email;
    dispositionData.composerId = user.userid;

    // Create disposition composition in openEHR
    const result = await createDispositionComposition(
      ehrId,
      dispositionData,
      membership.workspace.name || "Emergency Department"
    );

    return NextResponse.json({
      success: true,
      compositionUid: result.compositionUid,
      disposition: dispositionData,
      message: `Patient disposition set to ${dispositionData.type.toUpperCase()}`,
    });
    });
  } catch (error) {
    console.error("Error creating disposition:", error);
    return NextResponse.json(
      { error: "Failed to create disposition", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/disposition
 * Retrieve the latest patient disposition from openEHR
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;

    // Authenticate user
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
    return withTenant(workspaceid, async () => {

    // Verify workspace access
    const memberships = await getUserWorkspaces(user.userid);
    const membership = memberships.find((m) => m.workspace.workspaceid === workspaceid);
    if (!membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Ensure EHR exists for patient
    const ehrId = await ensurePatientEHR(patientid);

    // Get latest disposition from openEHR
    const disposition = await getLatestDisposition(ehrId);

    if (!disposition) {
      return NextResponse.json({
        success: true,
        disposition: null,
        message: "No disposition found for this patient",
      });
    }

    return NextResponse.json({
      success: true,
      disposition,
    });
    });
  } catch (error) {
    console.error("Error fetching disposition:", error);
    return NextResponse.json(
      { error: "Failed to fetch disposition", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
