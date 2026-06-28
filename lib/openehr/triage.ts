import { createOpenEHRComposition } from "@/lib/openehr/openehr";

export interface TriageRecord {
  patientId: string;
  triageLevel: "red" | "yellow" | "green";
  esi: string;
  chiefComplaint: string;
  allergies: string;
  arrivalMode: string;
  notes: string;
  pain: number;
  weight: string;
  medsGiven: string[];
  procedures: string;
}

export function buildTriageComposition(
  record: TriageRecord,
  composerName: string
): Record<string, unknown> {
  const eventTime = new Date().toISOString();

  const clinicalDescription = [
    record.triageLevel && `Triage level: ${record.triageLevel.toUpperCase()}`,
    record.esi && `ESI: ${record.esi}`,
    record.arrivalMode && `Arrival mode: ${record.arrivalMode}`,
    record.allergies && `Allergies: ${record.allergies}`,
    record.pain !== undefined && `Pain score: ${record.pain}/10`,
    record.weight && `Weight: ${record.weight} kg`,
  ]
    .filter(Boolean)
    .join(" | ");

  const comment = [
    record.notes && `Notes: ${record.notes}`,
    record.medsGiven.length > 0 && `Meds given: ${record.medsGiven.join(", ")}`,
    record.procedures && `Procedures: ${record.procedures}`,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    "template_triage_v1/language|code": "en",
    "template_triage_v1/language|terminology": "ISO_639-1",
    "template_triage_v1/territory|code": "US",
    "template_triage_v1/territory|terminology": "ISO_3166-1",
    "template_triage_v1/composer|name": composerName,
    "template_triage_v1/context/start_time": eventTime,
    "template_triage_v1/context/setting|code": "225",
    "template_triage_v1/context/setting|value": "emergency care",
    "template_triage_v1/context/setting|terminology": "openehr",
    "template_triage_v1/category|code": "433",
    "template_triage_v1/category|value": "event",
    "template_triage_v1/category|terminology": "openehr",
    "template_triage_v1/problem_diagnosis/problem_diagnosis_name":
      record.chiefComplaint || "Triage encounter",
    "template_triage_v1/problem_diagnosis/clinical_description":
      clinicalDescription,
    "template_triage_v1/problem_diagnosis/comment": comment,
  };
}

export async function createTriageComposition(
  ehrId: string,
  record: TriageRecord,
  composerName: string
): Promise<string> {
  const composition = buildTriageComposition(record, composerName);
  return createOpenEHRComposition(ehrId, "template_triage_v1", composition);
}
