import { createOpenEHRComposition } from "@/lib/openehr/openehr";

export interface VitalSigns {
  bp: string;
  hr: string;
  rr: string;
  temp: string;
  spo2: string;
  weight: string;
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

  if (vitals.temp) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|magnitude"] =
      parseFloat(vitals.temp);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/body_temperature|unit"] =
      "°C";
  }

  const bp = vitals.bp;
  if (bp && bp.includes("/")) {
    const [systolic, diastolic] = bp.split("/");
    if (systolic && diastolic) {
      composition["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|magnitude"] =
        parseFloat(systolic.trim());
      composition["template_clinical_encounter_v1/vital_signs/any_event:0/systolic_blood_pressure|unit"] =
        "mm[Hg]";
      composition["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|magnitude"] =
        parseFloat(diastolic.trim());
      composition["template_clinical_encounter_v1/vital_signs/any_event:0/diastolic_blood_pressure|unit"] =
        "mm[Hg]";
    }
  }

  if (vitals.hr) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|magnitude"] =
      parseFloat(vitals.hr);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/heart_rate|unit"] = "/min";
  }

  if (vitals.rr) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|magnitude"] =
      parseFloat(vitals.rr);
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/respiratory_rate|unit"] = "/min";
  }

  if (vitals.spo2) {
    composition["template_clinical_encounter_v1/vital_signs/any_event:0/oxygen_saturation_spo2|magnitude"] =
      parseFloat(vitals.spo2);
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
  return createOpenEHRComposition(ehrId, "template_clinical_encounter_v1", composition);
}
