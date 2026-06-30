import { createOpenEHRComposition } from "@/lib/openehr/openehr";

export const VITALS_TEMPLATE_ID = "template_clinical_encounter_v1";

export interface VitalSigns {
  temperature: string;
  systolic: string;
  diastolic: string;
  heartRate: string;
  respiratoryRate: string;
  spO2: string;
}

export function buildVitalSignsComposition(
  vitals: VitalSigns,
  composerName: string
): Record<string, unknown> {
  const eventTime = new Date().toISOString();

  const composition: Record<string, unknown> = {
    "template_clinical_encounter_v1/language|code": "en",
    "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
    "template_clinical_encounter_v1/territory|code": "US",
    "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
    "template_clinical_encounter_v1/composer|name": composerName,
    "template_clinical_encounter_v1/context/start_time": eventTime,
    "template_clinical_encounter_v1/context/setting|code": "238",
    "template_clinical_encounter_v1/context/setting|value": "other care",
    "template_clinical_encounter_v1/context/setting|terminology": "openehr",
    "template_clinical_encounter_v1/category|code": "433",
    "template_clinical_encounter_v1/category|value": "event",
    "template_clinical_encounter_v1/category|terminology": "openehr",
    "template_clinical_encounter_v1/vital_signs/any_event:0/time": eventTime,
  };

  if (vitals.temperature) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude"] =
      parseFloat(vitals.temperature);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|unit"] = "°C";
  }

  if (vitals.systolic) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"] =
      parseFloat(vitals.systolic);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|unit"] =
      "mm[Hg]";
  }

  if (vitals.diastolic) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"] =
      parseFloat(vitals.diastolic);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit"] =
      "mm[Hg]";
  }

  if (vitals.heartRate) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude"] =
      parseFloat(vitals.heartRate);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|unit"] = "/min";
  }

  if (vitals.respiratoryRate) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|magnitude"] =
      parseFloat(vitals.respiratoryRate);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|unit"] = "/min";
  }

  if (vitals.spO2) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/oxygen_saturation_spo2|magnitude"] =
      parseFloat(vitals.spO2);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/oxygen_saturation_spo2|unit"] = "%";
  }

  return composition;
}

export async function createVitalSignsComposition(
  ehrId: string,
  vitals: VitalSigns,
  composerName: string
): Promise<string> {
  const composition = buildVitalSignsComposition(vitals, composerName);
  return createOpenEHRComposition(ehrId, VITALS_TEMPLATE_ID, composition);
}
