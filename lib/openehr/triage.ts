import { createOpenEHRComposition } from "@/lib/openehr/openehr";

export interface TriageVitals {
  bp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  weight: string;
}

export interface TriageRecord {
  patientId: string;
  triageLevel: "red" | "yellow" | "green";
  esi: string;
  chiefComplaint: string;
  allergies: string;
  arrivalMode: string;
  notes: string;
  pain: number;
  medsGiven: string[];
  procedures: string;
  vitals: TriageVitals;
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
    record.vitals.weight && `Weight: ${record.vitals.weight} kg`,
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

  const composition: Record<string, unknown> = {
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
    "template_triage_v1/vital_signs/any_event:0/time": eventTime,
  };

  if (record.vitals.temp) {
    composition["template_triage_v1/vital_signs/any_event:0/body_temperature|magnitude"] =
      parseFloat(record.vitals.temp);
    composition["template_triage_v1/vital_signs/any_event:0/body_temperature|unit"] =
      "°C";
  }

  const bp = record.vitals.bp;
  if (bp && bp.includes("/")) {
    const [systolic, diastolic] = bp.split("/");
    if (systolic && diastolic) {
      composition["template_triage_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"] =
        parseFloat(systolic.trim());
      composition["template_triage_v1/vital_signs/any_event:0/systolic_blood_pressure|unit"] =
        "mm[Hg]";
      composition["template_triage_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"] =
        parseFloat(diastolic.trim());
      composition["template_triage_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit"] =
        "mm[Hg]";
    }
  }

  if (record.vitals.hr) {
    composition["template_triage_v1/vital_signs/any_event:0/heart_rate|magnitude"] =
      parseFloat(record.vitals.hr);
    composition["template_triage_v1/vital_signs/any_event:0/heart_rate|unit"] = "/min";
  }

  if (record.vitals.rr) {
    composition["template_triage_v1/vital_signs/any_event:0/respiratory_rate|magnitude"] =
      parseFloat(record.vitals.rr);
    composition["template_triage_v1/vital_signs/any_event:0/respiratory_rate|unit"] = "/min";
  }

  if (record.vitals.spo2) {
    composition["template_triage_v1/vital_signs/any_event:0/oxygen_saturation_spo2|magnitude"] =
      parseFloat(record.vitals.spo2);
    composition["template_triage_v1/vital_signs/any_event:0/oxygen_saturation_spo2|unit"] = "%";
  }

  return composition;
}

export async function createTriageComposition(
  ehrId: string,
  record: TriageRecord,
  composerName: string
): Promise<string> {
  const composition = buildTriageComposition(record, composerName);
  return createOpenEHRComposition(ehrId, "template_triage_v1", composition);
}
