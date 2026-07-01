import axios from "axios";
import fs from "fs";
import path from "path";

function getBasicAuth(): string {
  const username = process.env.EHRBASE_USER?.trim() || "";
  const password = process.env.EHRBASE_PASSWORD?.trim() || "";
  return Buffer.from(`${username}:${password}`, "utf-8").toString("base64");
}

function getHeaders(extra?: Record<string, string>) {
  return {
    "Content-Type": "application/json",
    "X-API-Key": process.env.EHRBASE_API_KEY || "",
    Authorization: `Basic ${getBasicAuth()}`,
    ...extra,
  };
}

async function ensureDispositionTemplate(): Promise<void> {
  const ehrbaseUrl = process.env.EHRBASE_URL?.trim() || "";
  const templateId = "template_patient_disposition_v1";
  const templatesUrl = `${ehrbaseUrl}/ehrbase/rest/openehr/v1/definition/template/adl1.4`;

  try {
    // Check if template already exists
    const listRes = await axios.get(templatesUrl, { headers: getHeaders() });
    const templates = listRes.data as Array<{ template_id: string }>;
    if (templates.some((t) => t.template_id === templateId)) return;
  } catch {
    // Ignore listing errors, attempt upload anyway
  }

  try {
    const optPath = path.join(process.cwd(), "openehr", "templates", `${templateId}.opt`);
    const optContent = fs.readFileSync(optPath, "utf-8");
    await axios.post(templatesUrl, optContent, {
      headers: {
        ...getHeaders(),
        "Content-Type": "application/xml",
      },
    });
    console.log(`[disposition] Uploaded template: ${templateId}`);
  } catch (err) {
    console.error(`[disposition] Failed to upload template ${templateId}:`, err);
  }
}

// Patient Disposition Composition - FLAT FORMAT
export interface PatientDispositionComposition {
  // Category
  "template_patient_disposition_v1/category|terminology"?: string;
  "template_patient_disposition_v1/category|code"?: string;
  "template_patient_disposition_v1/category|value"?: string;

  // Context
  "template_patient_disposition_v1/context/start_time"?: string;
  "template_patient_disposition_v1/context/setting|value"?: string;
  "template_patient_disposition_v1/context/setting|code"?: string;
  "template_patient_disposition_v1/context/setting|terminology"?: string;
  "template_patient_disposition_v1/context/_health_care_facility|name"?: string;

  // Disposition data (EVALUATION at0000/at0001)
  "template_patient_disposition_v1/patient_disposition/disposition_type|code"?: string;
  "template_patient_disposition_v1/patient_disposition/disposition_type|value"?: string;
  "template_patient_disposition_v1/patient_disposition/disposition_type|terminology"?: string;
  "template_patient_disposition_v1/patient_disposition/disposition_date_time"?: string;
  "template_patient_disposition_v1/patient_disposition/ward_unit"?: string;
  "template_patient_disposition_v1/patient_disposition/bed_number"?: string;
  "template_patient_disposition_v1/patient_disposition/estimated_length_of_stay|magnitude"?: number;
  "template_patient_disposition_v1/patient_disposition/estimated_length_of_stay|unit"?: string;
  "template_patient_disposition_v1/patient_disposition/transfer_to_facility"?: string;
  "template_patient_disposition_v1/patient_disposition/discharge_summary"?: string;
  "template_patient_disposition_v1/patient_disposition/prescription"?: string;
  "template_patient_disposition_v1/patient_disposition/follow_up_instructions"?: string;
  "template_patient_disposition_v1/patient_disposition/admission_fee|magnitude"?: number;
  "template_patient_disposition_v1/patient_disposition/admission_fee|unit"?: string;
  "template_patient_disposition_v1/patient_disposition/ward_cost_per_day|magnitude"?: number;
  "template_patient_disposition_v1/patient_disposition/ward_cost_per_day|unit"?: string;
  "template_patient_disposition_v1/patient_disposition/total_cost|magnitude"?: number;
  "template_patient_disposition_v1/patient_disposition/total_cost|unit"?: string;

  // Composer
  "template_patient_disposition_v1/composer|name"?: string;
  "template_patient_disposition_v1/composer|id"?: string;

  // Language & Encoding
  "template_patient_disposition_v1/language|code"?: string;
  "template_patient_disposition_v1/language|terminology"?: string;
  "template_patient_disposition_v1/territory|code"?: string;
  "template_patient_disposition_v1/territory|terminology"?: string;
}

export interface DispositionData {
  type: "admit" | "transfer" | "discharge";
  ward?: string;
  bedNumber?: string;
  days?: number;
  transferTo?: string;
  dischargeSummary?: string;
  prescription?: string;
  followUp?: string;
  admissionPrice?: number;
  wardPrice?: number;
  totalPrice?: number;
  composerName?: string;
  composerId?: string;
  // Emergency visit data
  emergencyVisitData?: {
    triageLevel?: string;
    esi?: string;
    chiefComplaint?: string;
    arrivalMode?: string;
    arrivalTime?: string;
    painScore?: number;
    allergies?: string;
    vitals?: Array<{
      temperature?: number;
      systolic?: number;
      diastolic?: number;
      heartRate?: number;
      respiratoryRate?: number;
      spO2?: number;
      recordedTime?: string;
    }>;
    labResults?: Array<{
      testName: string;
      reportDate: string;
      conclusion?: string;
      price?: number;
    }>;
    labOrders?: Array<{
      serviceName: string;
      requestedDate: string;
      urgency?: string;
      status?: string;
    }>;
    imagingResults?: Array<{
      studyName: string;
      reportDate: string;
      impression?: string;
      price?: number;
    }>;
    ecgResults?: Array<{
      testName: string;
      reportDate: string;
      interpretation?: string;
      price?: number;
    }>;
    diagnoses?: Array<{
      problemDiagnosis: string;
      clinicalStatus: string;
      recordedTime: string;
    }>;
    procedures?: Array<{
      procedureName: string;
      recordedTime: string;
    }>;
    medications?: Array<{
      medicationName: string;
      route?: string;
      timing?: string;
    }>;
    servicesProvided?: Array<{
      serviceName: string;
      category: string;
      price: number;
    }>;
  };
}

/**
 * Create a Patient Disposition composition in openEHR
 * Uses template_clinical_encounter_v1 with problem_diagnosis to store disposition data.
 */
export async function createDispositionComposition(
  ehrId: string,
  dispositionData: DispositionData,
  facilityName: string = "Emergency Department"
): Promise<{ compositionUid: string; data: PatientDispositionComposition }> {
  const ehrbaseUrl = process.env.EHRBASE_URL?.trim() || "";
  const now = new Date().toISOString();
  const pfx = "template_clinical_encounter_v1";

  // Encode all disposition fields as JSON in clinical_description
  const payload: Record<string, unknown> = {
    ward: dispositionData.ward,
    bedNumber: dispositionData.bedNumber,
    days: dispositionData.days,
    transferTo: dispositionData.transferTo,
    dischargeSummary: dispositionData.dischargeSummary,
    prescription: dispositionData.prescription,
    followUp: dispositionData.followUp,
    admissionPrice: dispositionData.admissionPrice,
    wardPrice: dispositionData.wardPrice,
    totalPrice: dispositionData.totalPrice,
    facility: facilityName,
    dateTime: now,
    emergencyVisitData: dispositionData.emergencyVisitData,
  };

  const composition: Record<string, unknown> = {
    [`${pfx}/category|terminology`]: "openehr",
    [`${pfx}/category|code`]: "433",
    [`${pfx}/category|value`]: "event",
    [`${pfx}/context/start_time`]: now,
    [`${pfx}/context/setting|value`]: "emergency care",
    [`${pfx}/context/setting|code`]: "227",
    [`${pfx}/context/setting|terminology`]: "openehr",
    [`${pfx}/composer|name`]: dispositionData.composerName || "System",
    [`${pfx}/language|code`]: "en",
    [`${pfx}/language|terminology`]: "ISO_639-1",
    [`${pfx}/territory|code`]: "IQ",
    [`${pfx}/territory|terminology`]: "ISO_3166-1",
    // problem_diagnosis used as disposition record
    [`${pfx}/problem_diagnosis/problem_diagnosis_name`]: `DISPOSITION_${dispositionData.type.toUpperCase()}`,
    [`${pfx}/problem_diagnosis/clinical_description`]: JSON.stringify(payload),
    [`${pfx}/problem_diagnosis/language|code`]: "en",
    [`${pfx}/problem_diagnosis/language|terminology`]: "ISO_639-1",
    [`${pfx}/problem_diagnosis/encoding|code`]: "UTF-8",
    [`${pfx}/problem_diagnosis/encoding|terminology`]: "IANA_character-sets",
  };

  const url = `${ehrbaseUrl}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition`;

  const response = await axios.post(url, composition, {
    headers: getHeaders({ "Prefer": "return=representation" }),
    params: { format: "FLAT", templateId: "template_clinical_encounter_v1" },
  }).catch((err) => {
    console.error("Disposition POST error response:", JSON.stringify(err.response?.data, null, 2));
    console.error("Composition sent:", JSON.stringify(composition, null, 2));
    throw err;
  });

  return {
    compositionUid: response.data.uid?.value ?? response.data,
    data: composition as unknown as PatientDispositionComposition,
  };
}

/**
 * Retrieve the latest Patient Disposition composition for a patient
 * Reads from template_clinical_encounter_v1 compositions where problem_diagnosis_name starts with DISPOSITION_
 */
export async function getLatestDisposition(ehrId: string): Promise<DispositionData | null> {
  const ehrbaseUrl = process.env.EHRBASE_URL?.trim() || "";
  const pfx = "template_clinical_encounter_v1";

  const aql = `
    SELECT c/uid/value as uid, c/context/start_time/value as start_time
    FROM EHR e
    CONTAINS COMPOSITION c
    CONTAINS EVALUATION eval[openEHR-EHR-EVALUATION.problem_diagnosis.v1]
    WHERE e/ehr_id/value = '${ehrId}'
    AND c/archetype_details/template_id/value = 'template_clinical_encounter_v1'
    AND eval/data[at0001]/items[at0002]/value/value MATCHES {'DISPOSITION_ADMIT','DISPOSITION_TRANSFER','DISPOSITION_DISCHARGE'}
    ORDER BY c/context/start_time/value DESC
    LIMIT 1
  `;

  try {
    const aqlResponse = await axios.post(
      `${ehrbaseUrl}/ehrbase/rest/openehr/v1/query/aql`,
      { q: aql },
      { headers: getHeaders() }
    ).catch((err) => {
      console.error("Disposition AQL error response:", JSON.stringify(err.response?.data, null, 2));
      throw err;
    });

    if (!aqlResponse.data.rows || aqlResponse.data.rows.length === 0) {
      return null;
    }

    const compositionUid = aqlResponse.data.rows[0][0];

    const compResponse = await axios.get(
      `${ehrbaseUrl}/ehrbase/rest/openehr/v1/ehr/${ehrId}/composition/${compositionUid}`,
      {
        headers: getHeaders({ Accept: "application/json" }),
        params: { format: "FLAT" },
      }
    );

    const flat = compResponse.data as Record<string, unknown>;
    const diagName = (flat[`${pfx}/problem_diagnosis/problem_diagnosis_name`] as string) || "";
    const typeRaw = diagName.replace("DISPOSITION_", "").toLowerCase();
    const type = (["admit", "transfer", "discharge"].includes(typeRaw) ? typeRaw : "discharge") as "admit" | "transfer" | "discharge";

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse((flat[`${pfx}/problem_diagnosis/clinical_description`] as string) || "{}");
    } catch { /* ignore parse errors */ }

    return {
      type,
      ward: payload.ward as string | undefined,
      bedNumber: payload.bedNumber as string | undefined,
      days: payload.days as number | undefined,
      transferTo: payload.transferTo as string | undefined,
      dischargeSummary: payload.dischargeSummary as string | undefined,
      prescription: payload.prescription as string | undefined,
      followUp: payload.followUp as string | undefined,
      admissionPrice: payload.admissionPrice as number | undefined,
      wardPrice: payload.wardPrice as number | undefined,
      totalPrice: payload.totalPrice as number | undefined,
      emergencyVisitData: payload.emergencyVisitData as DispositionData["emergencyVisitData"],
    };
  } catch (error) {
    console.error("Error fetching disposition:", error);
    return null;
  }
}
