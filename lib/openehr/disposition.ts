import axios from "axios";

const username = process.env.EHRBASE_USER?.trim() || "";
const password = process.env.EHRBASE_PASSWORD?.trim() || "";
const credentials = `${username}:${password}`;
const basicAuth = Buffer.from(credentials, "utf-8").toString("base64");

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
}

/**
 * Create a Patient Disposition composition in openEHR
 */
export async function createDispositionComposition(
  ehrId: string,
  dispositionData: DispositionData,
  facilityName: string = "Emergency Department"
): Promise<{ compositionUid: string; data: PatientDispositionComposition }> {
  const ehrbaseUrl = process.env.EHRBASE_URL?.trim() || "";
  
  const now = new Date().toISOString();
  
  const pfx = "template_patient_disposition_v1";

  // Build the composition based on disposition type
  const composition: PatientDispositionComposition = {
    // Category - event
    [`${pfx}/category|terminology`]: "openehr",
    [`${pfx}/category|code`]: "433",
    [`${pfx}/category|value`]: "event",

    // Context
    [`${pfx}/context/start_time`]: now,
    [`${pfx}/context/setting|value`]: "emergency care",
    [`${pfx}/context/setting|code`]: "227",
    [`${pfx}/context/setting|terminology`]: "openehr",
    [`${pfx}/context/_health_care_facility|name`]: facilityName,

    // Composer
    [`${pfx}/composer|name`]: dispositionData.composerName || "System",
    [`${pfx}/composer|id`]: dispositionData.composerId || "system",

    // Language & Territory
    [`${pfx}/language|code`]: "en",
    [`${pfx}/language|terminology`]: "ISO_639-1",
    [`${pfx}/territory|code`]: "IQ",
    [`${pfx}/territory|terminology`]: "ISO_3166-1",

    // Disposition type (shared across all types - at0002)
    [`${pfx}/patient_disposition/disposition_type|code`]: dispositionData.type,
    [`${pfx}/patient_disposition/disposition_type|value`]: dispositionData.type.charAt(0).toUpperCase() + dispositionData.type.slice(1),
    [`${pfx}/patient_disposition/disposition_type|terminology`]: "local",
    [`${pfx}/patient_disposition/disposition_date_time`]: now,
  };

  // Add disposition-specific data
  if (dispositionData.type === "discharge") {
    composition[`${pfx}/patient_disposition/discharge_summary`] = dispositionData.dischargeSummary || "";
    composition[`${pfx}/patient_disposition/prescription`] = dispositionData.prescription || "";
    composition[`${pfx}/patient_disposition/follow_up_instructions`] = dispositionData.followUp || "";
  } else if (dispositionData.type === "admit") {
    composition[`${pfx}/patient_disposition/ward_unit`] = dispositionData.ward || "";
    composition[`${pfx}/patient_disposition/bed_number`] = dispositionData.bedNumber || "";
    composition[`${pfx}/patient_disposition/estimated_length_of_stay|magnitude`] = dispositionData.days || 0;
    composition[`${pfx}/patient_disposition/estimated_length_of_stay|unit`] = "d";
    if (dispositionData.admissionPrice) {
      composition[`${pfx}/patient_disposition/admission_fee|magnitude`] = dispositionData.admissionPrice;
      composition[`${pfx}/patient_disposition/admission_fee|unit`] = "IQD";
    }
    if (dispositionData.wardPrice) {
      composition[`${pfx}/patient_disposition/ward_cost_per_day|magnitude`] = dispositionData.wardPrice;
      composition[`${pfx}/patient_disposition/ward_cost_per_day|unit`] = "IQD";
    }
    if (dispositionData.totalPrice) {
      composition[`${pfx}/patient_disposition/total_cost|magnitude`] = dispositionData.totalPrice;
      composition[`${pfx}/patient_disposition/total_cost|unit`] = "IQD";
    }
  } else if (dispositionData.type === "transfer") {
    composition[`${pfx}/patient_disposition/transfer_to_facility`] = dispositionData.transferTo || "";
  }

  // POST to EHRbase
  const url = `${ehrbaseUrl}/rest/openehr/v1/ehr/${ehrId}/composition`;
  
  const response = await axios.post(
    url,
    composition,
    {
      headers: {
        "Content-Type": "application/json",
        "Prefer": "return=representation",
        Authorization: `Basic ${basicAuth}`,
      },
      params: {
        format: "FLAT",
        templateId: "template_patient_disposition_v1",
      },
    }
  );

  return {
    compositionUid: response.data.uid.value,
    data: composition,
  };
}

/**
 * Retrieve the latest Patient Disposition composition for a patient
 */
export async function getLatestDisposition(ehrId: string): Promise<DispositionData | null> {
  const ehrbaseUrl = process.env.EHRBASE_URL?.trim() || "";
  const pfx = "template_patient_disposition_v1";

  // AQL to get the latest composition UID for this template
  const aql = `
    SELECT c/uid/value as uid
    FROM EHR e
    CONTAINS COMPOSITION c
    WHERE e/ehr_id/value = '${ehrId}'
    AND c/archetype_details/template_id/value = 'template_patient_disposition_v1'
    ORDER BY c/context/start_time/value DESC
    LIMIT 1
  `;

  try {
    const aqlResponse = await axios.post(
      `${ehrbaseUrl}/rest/openehr/v1/query/aql`,
      { q: aql },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    if (!aqlResponse.data.rows || aqlResponse.data.rows.length === 0) {
      return null;
    }

    const compositionUid = aqlResponse.data.rows[0][0];

    // Fetch composition in FLAT format
    const compResponse = await axios.get(
      `${ehrbaseUrl}/rest/openehr/v1/ehr/${ehrId}/composition/${compositionUid}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${basicAuth}`,
        },
        params: { format: "FLAT" },
      }
    );

    const flat = compResponse.data as Record<string, unknown>;

    const typeCode = (flat[`${pfx}/patient_disposition/disposition_type|code`] as string) || "";
    const type = (["admit", "transfer", "discharge"].includes(typeCode) ? typeCode : "discharge") as "admit" | "transfer" | "discharge";

    return {
      type,
      ward: (flat[`${pfx}/patient_disposition/ward_unit`] as string) || undefined,
      bedNumber: (flat[`${pfx}/patient_disposition/bed_number`] as string) || undefined,
      days: (flat[`${pfx}/patient_disposition/estimated_length_of_stay|magnitude`] as number) || undefined,
      transferTo: (flat[`${pfx}/patient_disposition/transfer_to_facility`] as string) || undefined,
      dischargeSummary: (flat[`${pfx}/patient_disposition/discharge_summary`] as string) || undefined,
      prescription: (flat[`${pfx}/patient_disposition/prescription`] as string) || undefined,
      followUp: (flat[`${pfx}/patient_disposition/follow_up_instructions`] as string) || undefined,
      admissionPrice: (flat[`${pfx}/patient_disposition/admission_fee|magnitude`] as number) || undefined,
      wardPrice: (flat[`${pfx}/patient_disposition/ward_cost_per_day|magnitude`] as number) || undefined,
      totalPrice: (flat[`${pfx}/patient_disposition/total_cost|magnitude`] as number) || undefined,
    };
  } catch (error) {
    console.error("Error fetching disposition:", error);
    return null;
  }
}
