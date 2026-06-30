import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, emergencyDoctorAssignments, users } from "@/lib/db/schema";
import { eq, or, isNull, inArray, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { queryOpenEHR, getOpenEHRComposition } from "@/lib/openehr/openehr";

interface TriageCompositionRow {
  ehr_id: string;
  subject_id: string;
  composition_uid: string;
  start_time: string;
  composition_name: string;
}

export interface TriageDashboardRecord {
  visitId: string;
  patientId: string;
  patientName: string;
  age: number;
  gender: string;
  mrn: string;
  arrivalTime: string;
  arrivalMode: string;
  chiefComplaint: string;
  triageLevel: "red" | "yellow" | "green";
  esi: string;
  painScore: number;
  waiting: number;
  status: string;
  doctor: string;
  allergies: string;
  medsGiven: string[];
  procedures: string;
  notes: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;

    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );
    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const patientRows = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        lastname: patients.lastname,
        middlename: patients.middlename,
        nationalid: patients.nationalid,
        dateofbirth: patients.dateofbirth,
        gender: patients.gender,
      })
      .from(patients)
      .where(
        or(
          eq(patients.workspaceid, workspaceid),
          isNull(patients.workspaceid)
        )
      );

    const patientMap = new Map<string, (typeof patientRows)[0]>();
    for (const p of patientRows) {
      patientMap.set(p.patientid, p);
      if (p.nationalid) {
        patientMap.set(p.nationalid, p);
      }
    }

    const query = `SELECT e/ehr_id/value AS ehr_id, e/ehr_status/subject/external_ref/id/value AS subject_id, c/uid/value AS composition_uid, c/context/start_time/value AS start_time, c/name/value AS composition_name FROM EHR e CONTAINS COMPOSITION c WHERE c/archetype_details/template_id/value = 'template_triage_v1' ORDER BY c/context/start_time/value DESC LIMIT 100`;
    const rows = await queryOpenEHR<TriageCompositionRow>(query);

    const records: TriageDashboardRecord[] = [];

    for (const row of rows) {
      const patient = patientMap.get(row.subject_id);
      if (!patient) continue;

      const flat = (await getOpenEHRComposition(
        row.ehr_id,
        row.composition_uid
      )) as Record<string, unknown>;

      const chiefComplaint = String(
        flat["template_triage_v1/problem_diagnosis/problem_diagnosis_name"] ||
          ""
      );
      const clinicalDescription = String(
        flat["template_triage_v1/problem_diagnosis/clinical_description"] || ""
      );
      const comment = String(
        flat["template_triage_v1/problem_diagnosis/comment"] || ""
      );

      const triageLevelMatch = clinicalDescription.match(/Triage level:\s*(\w+)/i);
      const esiMatch = clinicalDescription.match(/ESI:\s*(\d+)/);
      const arrivalModeMatch = clinicalDescription.match(/Arrival mode:\s*([^|]+)/);
      const painMatch = clinicalDescription.match(/Pain score:\s*(\d+)\/10/);
      const allergiesMatch = clinicalDescription.match(/Allergies:\s*([^|]+)/);

      const triageLevelRaw = triageLevelMatch
        ? triageLevelMatch[1].toLowerCase()
        : "green";
      const triageLevel: "red" | "yellow" | "green" =
        triageLevelRaw === "red" || triageLevelRaw === "yellow"
          ? triageLevelRaw
          : "green";

      const esi = esiMatch ? esiMatch[1] : "";
      const arrivalMode = arrivalModeMatch ? arrivalModeMatch[1].trim() : "";
      const painScore = painMatch ? parseInt(painMatch[1], 10) : 0;
      const allergies = allergiesMatch ? allergiesMatch[1].trim() : "";

      const medsMatch = comment.match(/Meds given:\s*(.+)/);
      const medsGiven = medsMatch
        ? medsMatch[1].split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      const proceduresMatch = comment.match(/Procedures:\s*([^|]+)/);
      const procedures = proceduresMatch ? proceduresMatch[1].trim() : "";

      const notesMatch = comment.match(/Notes:\s*([^|]+)/);
      const notes = notesMatch ? notesMatch[1].trim() : "";

      const age = patient.dateofbirth
        ? Math.floor(
            (Date.now() - new Date(patient.dateofbirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000)
          )
        : 0;

      const waiting = Math.max(
        0,
        Math.floor((Date.now() - new Date(row.start_time).getTime()) / 60000)
      );

      records.push({
        visitId: row.composition_uid,
        patientId: patient.patientid,
        patientName: `${patient.firstname} ${patient.middlename || ""} ${patient.lastname}`.trim(),
        age,
        gender: patient.gender || "",
        mrn: patient.nationalid || patient.patientid,
        arrivalTime: row.start_time,
        arrivalMode,
        chiefComplaint,
        triageLevel,
        esi,
        painScore,
        waiting,
        status: "waiting",
        doctor: "Unassigned",
        allergies,
        medsGiven,
        procedures,
        notes,
      });
    }

    if (records.length > 0) {
      const visitIds = records.map((r) => r.visitId);
      const assignments = await db
        .select({
          visitid: emergencyDoctorAssignments.visitid,
          name: users.name,
        })
        .from(emergencyDoctorAssignments)
        .innerJoin(users, eq(emergencyDoctorAssignments.doctorid, users.userid))
        .where(
          and(
            eq(emergencyDoctorAssignments.workspaceid, workspaceid),
            inArray(emergencyDoctorAssignments.visitid, visitIds)
          )
        );

      const assignmentMap = new Map<string, string>();
      for (const a of assignments) {
        assignmentMap.set(a.visitid, a.name || "Unknown");
      }
      for (const r of records) {
        if (assignmentMap.has(r.visitId)) {
          r.doctor = assignmentMap.get(r.visitId)!;
        }
      }
    }

    const latestByPatient = new Map<string, TriageDashboardRecord>();
    for (const r of records) {
      const existing = latestByPatient.get(r.patientId);
      if (!existing || new Date(r.arrivalTime) > new Date(existing.arrivalTime)) {
        latestByPatient.set(r.patientId, r);
      }
    }

    const result = Array.from(latestByPatient.values()).sort(
      (a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime()
    );

    return NextResponse.json({ records: result });
  } catch (error) {
    console.error("[triage][GET] error:", error);
    return NextResponse.json(
      { error: "Failed to load triage records" },
      { status: 500 }
    );
  }
}
