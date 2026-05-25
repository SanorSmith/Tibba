import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { queryOpenEHR } from "@/lib/openehr/openehr";

/**
 * GET /api/d/[workspaceid]/doctor/referrals
 * Retrieve incoming and outgoing referrals for the current doctor
 * Uses the same approach as patient referrals endpoint (which works in ~3 seconds)
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    
    console.log("[Doctor Referrals] API called for workspace:", workspaceid, "limit:", limit, "offset:", offset);
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[Doctor Referrals] User:", user.email);

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (membership.role !== "doctor") {
      return NextResponse.json({ error: "Forbidden - Doctor access only" }, { status: 403 });
    }

    // Get doctor's name from staff record
    let doctorRecord = await db
      .select()
      .from(staff)
      .where(eq(staff.email, user.email))
      .limit(1);

    if (doctorRecord.length === 0) {
      doctorRecord = await db
        .select()
        .from(staff)
        .where(and(eq(staff.workspaceid, workspaceid), eq(staff.role, "doctor")))
        .limit(1);
    }

    const doctorFullName = doctorRecord.length > 0
      ? `${doctorRecord[0].firstname} ${doctorRecord[0].lastname}`
      : user.name || user.email;
    
    // Also store user.name and email for matching
    const userName = user.name || "";
    const userEmail = user.email || "";
    
    console.log("[Doctor Referrals] Doctor identifiers:", {
      doctorFullName,
      userName,
      userEmail
    });

    // Use AQL to query all referrals across all EHRs in one go
    const aqlQuery = `
      SELECT 
        c/uid/value AS composition_uid,
        c/context/start_time/value AS start_time,
        eval/data[at0001]/items[at0002]/value/value AS problem_diagnosis,
        eval/data[at0001]/items[at0009]/value/value AS clinical_description,
        eval/data[at0001]/items[at0077]/value/value AS variant,
        eval/data[at0001]/items[at0069]/value/value AS comment,
        eval/data[at0001]/items[at0012]/value/value AS body_site,
        c/composer/name AS composer_name,
        e/ehr_id/value AS ehr_id,
        e/ehr_status/subject/external_ref/id/value AS subject_id
      FROM EHR e
      CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]
      CONTAINS EVALUATION eval[openEHR-EHR-EVALUATION.problem_diagnosis.v1]
      WHERE c/archetype_details/template_id/value = 'template_clinical_encounter_v1'
    `;

    console.log("[Doctor Referrals] Executing AQL query for all referrals");

    // Execute AQL query using the helper function
    const results = await queryOpenEHR<{
      composition_uid: string;
      start_time: string;
      problem_diagnosis: string;
      clinical_description: string;
      variant: string;
      comment: string;
      body_site: string;
      composer_name: string;
      ehr_id: string;
      subject_id: string;
    }>(aqlQuery);

    console.log("[Doctor Referrals] AQL returned", results.length, "compositions");

    // Get all unique subject IDs to fetch patient info
    const subjectIds = [...new Set(results.map(r => r.subject_id).filter(Boolean))];
    
    // Fetch patient info from database for all subject IDs
    const { patients } = await import("@/lib/db/schema");
    const { inArray } = await import("drizzle-orm");
    
    const patientsData = await db
      .select({
        patientid: patients.patientid,
        nationalid: patients.nationalid,
        firstname: patients.firstname,
        lastname: patients.lastname,
      })
      .from(patients)
      .where(inArray(patients.nationalid, subjectIds));
    
    // Create a map for quick lookup
    const patientMap = new Map(
      patientsData.map(p => [p.nationalid, p])
    );

    const incomingReferrals: Array<any> = [];
    const outgoingReferrals: Array<any> = [];

    // Process AQL results
    for (const row of results) {
      const problemDiagnosis = row.problem_diagnosis || "";
      
      // Only process referrals
      if (!problemDiagnosis.startsWith("REFERRAL:")) continue;

      const [department, receivingPhysician] = (row.clinical_description || "").split(" | ");
      const composer = row.composer_name || "Unknown";
      
      // Get patient info from map
      const patient = patientMap.get(row.subject_id);

      console.log("[Doctor Referrals] 🔍 Found referral:", {
        problemDiagnosis,
        composer,
        receivingPhysician,
        patientName: patient ? `${patient.firstname} ${patient.lastname}` : row.subject_id
      });

      const referral = {
        composition_uid: row.composition_uid,
        recorded_time: row.start_time,
        physician_department: department || "",
        receiving_physician: receivingPhysician || "",
        clinical_indication: problemDiagnosis.replace("REFERRAL: ", ""),
        urgency: (row.variant || "routine").toLowerCase(),
        comment: row.comment || "",
        referred_by: composer,
        status: row.body_site || "pending",
        patientid: patient?.patientid || "",
        patientName: patient ? `${patient.firstname} ${patient.lastname}` : "",
        patientNationalId: row.subject_id || "",
      };

      // Categorize as incoming or outgoing
      const receivingPhysicianLower = (receivingPhysician || "").toLowerCase();
      const composerLower = composer.toLowerCase();
      
      const isIncoming = 
        receivingPhysicianLower.includes(doctorFullName.toLowerCase()) ||
        (userName && receivingPhysicianLower.includes(userName.toLowerCase())) ||
        (userEmail && receivingPhysicianLower.includes(userEmail.toLowerCase()));
      
      const isOutgoing = 
        composerLower.includes(doctorFullName.toLowerCase()) ||
        (userName && composerLower.includes(userName.toLowerCase())) ||
        (userEmail && composerLower.includes(userEmail.toLowerCase()));
      
      if (isIncoming) {
        console.log("[Doctor Referrals] ✅ Incoming referral");
        incomingReferrals.push(referral);
      } else if (isOutgoing) {
        console.log("[Doctor Referrals] ✅ Outgoing referral");
        outgoingReferrals.push(referral);
      }
    }

    console.log("[Doctor Referrals] Found", incomingReferrals.length, "incoming,", outgoingReferrals.length, "outgoing");

    return NextResponse.json({ 
      incomingReferrals, 
      outgoingReferrals
    }, { status: 200 });
  } catch (error) {
    console.error("[Doctor Referrals] Error:", error);
    return NextResponse.json({ 
      incomingReferrals: [], 
      outgoingReferrals: [],
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 200 });
  }
}
