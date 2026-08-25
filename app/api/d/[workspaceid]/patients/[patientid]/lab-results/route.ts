import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import { testResults, accessionSamples } from "@/lib/db/schema";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

// In-memory storage for lab results (dummy data)
// In production, this would be stored in EHRbase or a database
interface LabTestAnalyte {
  analyte_name: string;
  analyte_code?: string;
  result_value: string | number;
  result_unit?: string;
  reference_range?: string;
  result_status: string; // normal, high, low, critical
  result_flag?: string; // H, L, HH, LL
}

interface LabTestResult {
  composition_uid: string;
  recorded_time: string;
  
  // Test identification (openEHR: Test name)
  test_name: string;
  test_name_code?: string;
  protocol: string; // Laboratory internal identifier
  
  // Specimen details (openEHR: Specimen)
  specimen_type?: string;
  specimen_collection_time?: string;
  specimen_received_time?: string;
  specimen_id?: string;
  
  // Overall test status (openEHR: Overall test status)
  overall_test_status: string; // registered, partial, preliminary, final, amended, cancelled
  
  // Clinical information (openEHR: Clinical information provided)
  clinical_information_provided?: string;
  
  // Test results (openEHR: Test result - analytes)
  test_results: LabTestAnalyte[];
  
  // Interpretation (openEHR: Conclusion)
  conclusion?: string;
  
  // Test diagnosis (openEHR: Test diagnosis)
  test_diagnosis?: string;
  
  // Metadata
  laboratory_name: string;
  reported_by?: string;
  verified_by?: string;
  report_date: string;

  // Pricing
  price?: number;
  currency?: string;
}

interface ImagingResult {
  composition_uid: string;
  recorded_time: string;
  study_name: string;
  modality: string;
  body_part: string;
  finding_summary: string;
  impression: string;
  radiologist: string;
  report_date: string;
  overall_status: string;
  price: number;
  currency?: string;
  images?: { image_uid: string; description: string }[];
}

interface ECGResult {
  composition_uid: string;
  recorded_time: string;
  test_name: string;
  heart_rate: number;
  rhythm: string;
  pr_interval: string;
  qrs_duration: string;
  qt_interval: string;
  axis: string;
  findings: string;
  interpretation: string;
  reported_by: string;
  report_date: string;
  overall_status: string;
  price: number;
  currency?: string;
  ecg_image?: string;
}

// Initialize with dummy data for demonstration
const labResultsStore: Record<string, LabTestResult[]> = {
  // Sample patient ID with dummy lab results
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "lab-result-1731847200000-cbc001",
      recorded_time: "2024-11-15T09:30:00.000Z",
      test_name: "Complete Blood Count (CBC)",
      test_name_code: "58410-2",
      protocol: "LAB-2024-001234",
      specimen_type: "Blood (EDTA tube)",
      specimen_collection_time: "2024-11-15T08:00:00.000Z",
      specimen_received_time: "2024-11-15T08:30:00.000Z",
      specimen_id: "SPEC-2024-001234",
      overall_test_status: "final",
      clinical_information_provided: "Routine annual physical examination. Patient reports feeling well with no specific complaints.",
      test_results: [
        {
          analyte_name: "Hemoglobin",
          analyte_code: "718-7",
          result_value: 14.5,
          result_unit: "g/dL",
          reference_range: "13.0 - 17.0",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "White Blood Cell Count",
          analyte_code: "6690-2",
          result_value: 7.2,
          result_unit: "×10³/μL",
          reference_range: "4.0 - 11.0",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Platelet Count",
          analyte_code: "777-3",
          result_value: 250,
          result_unit: "×10³/μL",
          reference_range: "150 - 400",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Hematocrit",
          analyte_code: "4544-3",
          result_value: 42.5,
          result_unit: "%",
          reference_range: "38.0 - 50.0",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "MCV (Mean Corpuscular Volume)",
          analyte_code: "787-2",
          result_value: 88,
          result_unit: "fL",
          reference_range: "80 - 100",
          result_status: "normal",
          result_flag: "N"
        }
      ],
      conclusion: "All CBC parameters within normal limits. No evidence of anemia, infection, or clotting disorders.",
      test_diagnosis: "Normal complete blood count",
      laboratory_name: "Central Haematology Laboratory",
      reported_by: "Dr. Sarah Johnson, MD",
      verified_by: "Dr. Michael Chen, MD",
      report_date: "2024-11-15T10:00:00.000Z"
    },
    {
      composition_uid: "lab-result-1731760800000-lipid001",
      recorded_time: "2024-11-14T14:20:00.000Z",
      test_name: "Lipid Panel",
      test_name_code: "24331-1",
      protocol: "LAB-2024-001198",
      specimen_type: "Blood (Serum)",
      specimen_collection_time: "2024-11-14T07:30:00.000Z",
      specimen_received_time: "2024-11-14T08:00:00.000Z",
      specimen_id: "SPEC-2024-001198",
      overall_test_status: "final",
      clinical_information_provided: "Cardiovascular risk assessment. Patient has family history of heart disease. Fasting for 12 hours confirmed.",
      test_results: [
        {
          analyte_name: "Total Cholesterol",
          analyte_code: "2093-3",
          result_value: 220,
          result_unit: "mg/dL",
          reference_range: "< 200",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "HDL Cholesterol",
          analyte_code: "2085-9",
          result_value: 55,
          result_unit: "mg/dL",
          reference_range: "> 40",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "LDL Cholesterol",
          analyte_code: "18262-6",
          result_value: 145,
          result_unit: "mg/dL",
          reference_range: "< 100",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "Triglycerides",
          analyte_code: "2571-8",
          result_value: 180,
          result_unit: "mg/dL",
          reference_range: "< 150",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "VLDL Cholesterol",
          analyte_code: "13458-5",
          result_value: 36,
          result_unit: "mg/dL",
          reference_range: "5 - 40",
          result_status: "normal",
          result_flag: "N"
        }
      ],
      conclusion: "Elevated total cholesterol, LDL cholesterol, and triglycerides. HDL cholesterol is adequate. Increased cardiovascular risk.",
      test_diagnosis: "Hyperlipidemia - recommend lifestyle modifications and consider statin therapy. Follow-up lipid panel in 3 months.",
      laboratory_name: "Lipid & Metabolic Laboratory",
      reported_by: "Dr. Emily Rodriguez, PhD",
      verified_by: "Dr. James Wilson, MD",
      report_date: "2024-11-14T15:00:00.000Z"
    },
    {
      composition_uid: "lab-result-1731674400000-glucose001",
      recorded_time: "2024-11-13T11:45:00.000Z",
      test_name: "Fasting Blood Glucose",
      test_name_code: "1558-6",
      protocol: "LAB-2024-001165",
      specimen_type: "Blood (Plasma)",
      specimen_collection_time: "2024-11-13T07:00:00.000Z",
      specimen_received_time: "2024-11-13T07:30:00.000Z",
      specimen_id: "SPEC-2024-001165",
      overall_test_status: "final",
      clinical_information_provided: "Diabetes screening. Patient reports increased thirst and frequent urination. Fasting for 10 hours confirmed.",
      test_results: [
        {
          analyte_name: "Glucose (Fasting)",
          analyte_code: "1558-6",
          result_value: 142,
          result_unit: "mg/dL",
          reference_range: "70 - 100",
          result_status: "critical",
          result_flag: "HH"
        }
      ],
      conclusion: "Significantly elevated fasting blood glucose level, consistent with diabetes mellitus.",
      test_diagnosis: "Hyperglycemia - Diabetes mellitus suspected. Recommend HbA1c test for confirmation and endocrinology referral. Immediate lifestyle counseling and possible pharmacotherapy indicated.",
      laboratory_name: "Clinical Chemistry Laboratory",
      reported_by: "Dr. Patricia Lee, MD",
      verified_by: "Dr. Robert Kumar, MD",
      report_date: "2024-11-13T12:00:00.000Z"
    },
    {
      composition_uid: "lab-result-1731588000000-thyroid001",
      recorded_time: "2024-11-12T16:30:00.000Z",
      test_name: "Thyroid Function Panel",
      test_name_code: "24348-5",
      protocol: "LAB-2024-001132",
      specimen_type: "Blood (Serum)",
      specimen_collection_time: "2024-11-12T09:00:00.000Z",
      specimen_received_time: "2024-11-12T09:30:00.000Z",
      specimen_id: "SPEC-2024-001132",
      overall_test_status: "final",
      clinical_information_provided: "Patient presents with fatigue, weight gain, and cold intolerance. Suspected hypothyroidism.",
      test_results: [
        {
          analyte_name: "TSH (Thyroid Stimulating Hormone)",
          analyte_code: "3016-3",
          result_value: 8.5,
          result_unit: "mIU/L",
          reference_range: "0.4 - 4.0",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "Free T4 (Thyroxine)",
          analyte_code: "3024-7",
          result_value: 0.7,
          result_unit: "ng/dL",
          reference_range: "0.8 - 1.8",
          result_status: "low",
          result_flag: "L"
        },
        {
          analyte_name: "Free T3 (Triiodothyronine)",
          analyte_code: "3051-0",
          result_value: 2.1,
          result_unit: "pg/mL",
          reference_range: "2.3 - 4.2",
          result_status: "low",
          result_flag: "L"
        }
      ],
      conclusion: "Elevated TSH with decreased free T4 and T3 levels, consistent with primary hypothyroidism.",
      test_diagnosis: "Primary hypothyroidism - recommend levothyroxine therapy. Start with 50 mcg daily and recheck thyroid function in 6 weeks.",
      laboratory_name: "Endocrine Laboratory",
      reported_by: "Dr. Amanda Foster, MD",
      verified_by: "Dr. David Martinez, MD",
      report_date: "2024-11-12T17:00:00.000Z"
    },
    {
      composition_uid: "lab-result-1731501600000-renal001",
      recorded_time: "2024-11-11T13:15:00.000Z",
      test_name: "Renal Function Panel",
      test_name_code: "24362-6",
      protocol: "LAB-2024-001089",
      specimen_type: "Blood (Serum)",
      specimen_collection_time: "2024-11-11T08:30:00.000Z",
      specimen_received_time: "2024-11-11T09:00:00.000Z",
      specimen_id: "SPEC-2024-001089",
      overall_test_status: "final",
      clinical_information_provided: "Routine monitoring for patient with hypertension on ACE inhibitor therapy.",
      test_results: [
        {
          analyte_name: "Creatinine",
          analyte_code: "2160-0",
          result_value: 1.1,
          result_unit: "mg/dL",
          reference_range: "0.7 - 1.3",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "BUN (Blood Urea Nitrogen)",
          analyte_code: "3094-0",
          result_value: 18,
          result_unit: "mg/dL",
          reference_range: "7 - 20",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "eGFR (Estimated Glomerular Filtration Rate)",
          analyte_code: "33914-3",
          result_value: 85,
          result_unit: "mL/min/1.73m²",
          reference_range: "> 60",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Sodium",
          analyte_code: "2951-2",
          result_value: 140,
          result_unit: "mmol/L",
          reference_range: "136 - 145",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Potassium",
          analyte_code: "2823-3",
          result_value: 4.2,
          result_unit: "mmol/L",
          reference_range: "3.5 - 5.0",
          result_status: "normal",
          result_flag: "N"
        }
      ],
      conclusion: "All renal function parameters within normal limits. Kidney function is adequate.",
      test_diagnosis: "Normal renal function - continue current medication regimen. Repeat in 6 months.",
      laboratory_name: "Clinical Chemistry Laboratory",
      reported_by: "Dr. Lisa Thompson, MD",
      verified_by: "Dr. Mark Anderson, MD",
      report_date: "2024-11-11T14:00:00.000Z"
    }
  ],
  // Khalid Hassan - NID-1014 (Male, 34 yrs)
  "78fc988b-941b-46ec-aa9c-44493179345c": [
    {
      composition_uid: "lab-result-khalid-cbc-001",
      recorded_time: "2026-07-10T08:15:00.000Z",
      test_name: "Complete Blood Count (CBC)",
      test_name_code: "58410-2",
      protocol: "LAB-2026-002456",
      specimen_type: "Blood (EDTA tube)",
      specimen_collection_time: "2026-07-10T07:00:00.000Z",
      specimen_received_time: "2026-07-10T07:30:00.000Z",
      specimen_id: "SPEC-2026-002456",
      overall_test_status: "final",
      clinical_information_provided: "Patient presents with fatigue and pallor. Rule out anemia.",
      test_results: [
        {
          analyte_name: "Hemoglobin",
          analyte_code: "718-7",
          result_value: 11.2,
          result_unit: "g/dL",
          reference_range: "13.0 - 17.0",
          result_status: "low",
          result_flag: "L"
        },
        {
          analyte_name: "White Blood Cell Count",
          analyte_code: "6690-2",
          result_value: 6.5,
          result_unit: "×10³/μL",
          reference_range: "4.0 - 11.0",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Platelet Count",
          analyte_code: "777-3",
          result_value: 180,
          result_unit: "×10³/μL",
          reference_range: "150 - 400",
          result_status: "normal",
          result_flag: "N"
        },
        {
          analyte_name: "Hematocrit",
          analyte_code: "4544-3",
          result_value: 34.5,
          result_unit: "%",
          reference_range: "38.0 - 50.0",
          result_status: "low",
          result_flag: "L"
        },
        {
          analyte_name: "MCV (Mean Corpuscular Volume)",
          analyte_code: "787-2",
          result_value: 72,
          result_unit: "fL",
          reference_range: "80 - 100",
          result_status: "low",
          result_flag: "L"
        }
      ],
      conclusion: "Microcytic anemia detected. Low hemoglobin, hematocrit, and MCV suggest iron deficiency anemia.",
      test_diagnosis: "Iron deficiency anemia - recommend iron studies (serum iron, TIBC, ferritin) and further evaluation for source of blood loss.",
      laboratory_name: "Central Haematology Laboratory",
      reported_by: "Dr. Fatima Al-Rashid, MD",
      verified_by: "Dr. Ahmed Khalil, MD",
      report_date: "2026-07-10T09:00:00.000Z",
      price: 55,
      currency: "USD"
    },
    {
      composition_uid: "lab-result-khalid-iron-002",
      recorded_time: "2026-07-10T10:30:00.000Z",
      test_name: "Iron Studies Panel",
      test_name_code: "24352-6",
      protocol: "LAB-2026-002457",
      specimen_type: "Blood (Serum)",
      specimen_collection_time: "2026-07-10T07:00:00.000Z",
      specimen_received_time: "2026-07-10T07:30:00.000Z",
      specimen_id: "SPEC-2026-002457",
      overall_test_status: "final",
      clinical_information_provided: "Follow-up to CBC showing microcytic anemia.",
      test_results: [
        {
          analyte_name: "Serum Iron",
          analyte_code: "2498-4",
          result_value: 25,
          result_unit: "μg/dL",
          reference_range: "60 - 170",
          result_status: "low",
          result_flag: "L"
        },
        {
          analyte_name: "TIBC (Total Iron Binding Capacity)",
          analyte_code: "2500-7",
          result_value: 450,
          result_unit: "μg/dL",
          reference_range: "250 - 450",
          result_status: "high",
          result_flag: "H"
        },
        {
          analyte_name: "Transferrin Saturation",
          analyte_code: "2502-3",
          result_value: 5.6,
          result_unit: "%",
          reference_range: "20 - 50",
          result_status: "low",
          result_flag: "L"
        },
        {
          analyte_name: "Ferritin",
          analyte_code: "2276-4",
          result_value: 8,
          result_unit: "ng/mL",
          reference_range: "15 - 150",
          result_status: "low",
          result_flag: "L"
        }
      ],
      conclusion: "Severe iron deficiency confirmed. Low serum iron, low ferritin, high TIBC, and low transferrin saturation.",
      test_diagnosis: "Iron deficiency anemia confirmed - recommend oral iron supplementation and investigation for source of iron loss (GI evaluation for occult bleeding, dietary assessment).",
      laboratory_name: "Clinical Chemistry Laboratory",
      reported_by: "Dr. Omar Youssef, PhD",
      verified_by: "Dr. Layla Ibrahim, MD",
      report_date: "2026-07-10T11:00:00.000Z",
      price: 65,
      currency: "USD"
    }
  ]
};

const imagingResultsStore: Record<string, ImagingResult[]> = {
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "img-result-1731847200000-chest-xray",
      recorded_time: "2024-11-15T09:45:00.000Z",
      study_name: "Chest X-Ray",
      modality: "X-ray",
      body_part: "Chest",
      finding_summary: "Lungs are clear. No pleural effusion or pneumothorax. Cardiac silhouette normal.",
      impression: "Normal chest X-ray.",
      radiologist: "Dr. A. Smith",
      report_date: "2024-11-15T10:15:00.000Z",
      overall_status: "final",
      price: 75,
      currency: "USD",
      images: [
        { image_uid: "img-001", description: "PA chest view" },
      ],
    },
  ],
  // Khalid Hassan - NID-1014 (Male, 34 yrs)
  "78fc988b-941b-46ec-aa9c-44493179345c": [
    {
      composition_uid: "img-result-khalid-abdomen-001",
      recorded_time: "2026-07-11T11:45:00.000Z",
      study_name: "Abdominal Ultrasound",
      modality: "Ultrasound",
      body_part: "Abdomen",
      finding_summary: "Liver and spleen normal in size and echotexture. Gallbladder shows no stones. Kidneys normal. No free fluid in abdomen.",
      impression: "Normal abdominal ultrasound. No evidence of organomegaly or masses.",
      radiologist: "Dr. Nadia Mansour",
      report_date: "2026-07-11T12:15:00.000Z",
      overall_status: "final",
      price: 85,
      currency: "USD",
      images: [
        { image_uid: "img-khalid-001", description: "Liver view" },
        { image_uid: "img-khalid-002", description: "Spleen view" },
      ],
    },
  ],
};

const ecgResultsStore: Record<string, ECGResult[]> = {
  "eaf012cb-359a-4ed4-8679-124cbdf7465a": [
    {
      composition_uid: "ecg-result-1731847200000-001",
      recorded_time: "2024-11-15T09:30:00.000Z",
      test_name: "12-Lead ECG",
      heart_rate: 72,
      rhythm: "Sinus rhythm",
      pr_interval: "160 ms",
      qrs_duration: "88 ms",
      qt_interval: "400 ms",
      axis: "Normal",
      findings: "Normal sinus rhythm. No ST elevation or depression. No pathological Q waves.",
      interpretation: "Normal ECG. No evidence of ischemia or arrhythmia.",
      reported_by: "Dr. E. Jones, Cardiology",
      report_date: "2024-11-15T09:45:00.000Z",
      overall_status: "final",
      price: 45,
      currency: "USD",
      ecg_image: "/mock-ecg-waveform.svg",
    },
    {
      composition_uid: "ecg-result-1731760800000-002",
      recorded_time: "2024-11-14T14:15:00.000Z",
      test_name: "12-Lead ECG",
      heart_rate: 58,
      rhythm: "Sinus bradycardia",
      pr_interval: "180 ms",
      qrs_duration: "92 ms",
      qt_interval: "420 ms",
      axis: "Normal",
      findings: "Sinus bradycardia with heart rate of 58 bpm. No ST-T wave abnormalities. No conduction defects.",
      interpretation: "Sinus bradycardia. May be normal variant in athletic individuals. Clinical correlation recommended.",
      reported_by: "Dr. M. Hassan, Cardiology",
      report_date: "2024-11-14T14:30:00.000Z",
      overall_status: "final",
      price: 45,
      currency: "USD",
      ecg_image: "/mock-ecg-waveform.svg",
    },
    {
      composition_uid: "ecg-result-1731674400000-003",
      recorded_time: "2024-11-13T10:20:00.000Z",
      test_name: "12-Lead ECG",
      heart_rate: 105,
      rhythm: "Sinus tachycardia",
      pr_interval: "140 ms",
      qrs_duration: "86 ms",
      qt_interval: "360 ms",
      axis: "Normal",
      findings: "Sinus tachycardia with heart rate of 105 bpm. No acute ST-T changes. No ectopy noted.",
      interpretation: "Sinus tachycardia. Consider underlying causes such as anxiety, pain, fever, or hypovolemia.",
      reported_by: "Dr. S. Ahmed, Emergency Medicine",
      report_date: "2024-11-13T10:35:00.000Z",
      overall_status: "final",
      price: 45,
      currency: "USD",
      ecg_image: "/mock-ecg-waveform.svg",
    },
    {
      composition_uid: "ecg-result-1731588000000-004",
      recorded_time: "2024-11-12T16:45:00.000Z",
      test_name: "12-Lead ECG",
      heart_rate: 88,
      rhythm: "Atrial fibrillation",
      pr_interval: "Variable",
      qrs_duration: "90 ms",
      qt_interval: "380 ms",
      axis: "Normal",
      findings: "Irregularly irregular rhythm consistent with atrial fibrillation. Ventricular rate approximately 88 bpm. No acute ST changes.",
      interpretation: "Atrial fibrillation with controlled ventricular response. Recommend anticoagulation assessment and rate control optimization.",
      reported_by: "Dr. R. Patel, Cardiology",
      report_date: "2024-11-12T17:00:00.000Z",
      overall_status: "final",
      price: 45,
      currency: "USD",
      ecg_image: "/mock-ecg-waveform.svg",
    },
    {
      composition_uid: "ecg-result-1731501600000-005",
      recorded_time: "2024-11-11T08:30:00.000Z",
      test_name: "12-Lead ECG",
      heart_rate: 76,
      rhythm: "Sinus rhythm",
      pr_interval: "200 ms",
      qrs_duration: "120 ms",
      qt_interval: "440 ms",
      axis: "Left axis deviation",
      findings: "Sinus rhythm with first-degree AV block (PR 200 ms). Left bundle branch block pattern (QRS 120 ms). Left axis deviation.",
      interpretation: "First-degree AV block with complete left bundle branch block. Recommend echocardiography to assess left ventricular function.",
      reported_by: "Dr. L. Chen, Cardiology",
      report_date: "2024-11-11T08:50:00.000Z",
      overall_status: "final",
      price: 45,
      currency: "USD",
      ecg_image: "/mock-ecg-waveform.svg",
    },
  ],
  // Khalid Hassan - NID-1014 (Male, 34 yrs)
  "78fc988b-941b-46ec-aa9c-44493179345c": [
    {
      composition_uid: "ecg-result-khalid-001",
      recorded_time: "2026-07-11T09:15:00.000Z",
      test_name: "12-Lead ECG",
      heart_rate: 68,
      rhythm: "Sinus rhythm",
      pr_interval: "155 ms",
      qrs_duration: "85 ms",
      qt_interval: "395 ms",
      axis: "Normal",
      findings: "Normal sinus rhythm. No ST-T wave abnormalities. No conduction defects. QT interval within normal limits.",
      interpretation: "Normal ECG. No acute cardiac abnormalities detected.",
      reported_by: "Dr. Hassan Mahmoud, Cardiology",
      report_date: "2026-07-11T09:30:00.000Z",
      overall_status: "final",
      price: 45,
      currency: "USD",
      ecg_image: "/mock-ecg-waveform.svg",
    },
  ],
};

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/lab-results
 * Retrieve lab results for a patient (from dummy data)
 */
export async function GET(
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

    // Check workspace access
    const userWorkspaces = await getUserWorkspaces(user.userid);
    const membership = userWorkspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and nurses can view lab results
    if (membership.role !== "doctor" && membership.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get lab results from in-memory store (dummy data)
    const patientLabResults = labResultsStore[patientid] || [];

    // Also fetch real LIMS results from the database
    // Include openehrrequestid to group samples by their parent order
    const limsResults = await db
      .select({
        resultid: testResults.resultid,
        sampleid: testResults.sampleid,
        testcode: testResults.testcode,
        testname: testResults.testname,
        resultvalue: testResults.resultvalue,
        unit: testResults.unit,
        referencemin: testResults.referencemin,
        referencemax: testResults.referencemax,
        referencerange: testResults.referencerange,
        flag: testResults.flag,
        isabormal: testResults.isabormal,
        iscritical: testResults.iscritical,
        interpretation: testResults.interpretation,
        status: testResults.status,
        comment: testResults.comment,
        analyzeddate: testResults.analyzeddate,
        releaseddate: testResults.releaseddate,
        samplenumber: accessionSamples.samplenumber,
        sampletype: accessionSamples.sampletype,
        collectiondate: accessionSamples.collectiondate,
        labcategory: accessionSamples.labcategory,
        barcode: accessionSamples.barcode,
        openehrrequestid: accessionSamples.openehrrequestid,
      })
      .from(testResults)
      .innerJoin(accessionSamples, eq(testResults.sampleid, accessionSamples.sampleid))
      .where(
        and(
          eq(accessionSamples.patientid, patientid),
          eq(testResults.workspaceid, workspaceid)
        )
      )
      .orderBy(desc(testResults.analyzeddate));

    // Get facility name once
    const facilityName = membership.workspace.name || "Laboratory";

    // Group LIMS results by openehrrequestid (= order ID)
    // Samples that belong to the same order share the same openehrrequestid
    interface OrderMapValue {
      composition_uid: string;
      recorded_time: string;
      test_name: string;
      protocol: string;
      specimen_type: string | null;
      specimen_collection_time: string | undefined;
      specimen_id: string;
      overall_test_status: string;
      test_results: LabTestAnalyte[];
      laboratory_name: string;
      report_date: string;
      source: string;
      sampleid: string;
      orderid: string;
      price: number;
      currency: string;
      samples: { sampleid: string; samplenumber: string; sampletype: string; collectiondate: string | null; barcode: string | null; labcategory: string | null }[];
    }
    const orderMap = new Map<string, OrderMapValue>();
    
    for (const r of limsResults) {
      // Use openehrrequestid as group key; fall back to sampleid if no order link
      const orderKey = r.openehrrequestid || `no-order-${r.sampleid}`;
      
      if (!orderMap.has(orderKey)) {
        orderMap.set(orderKey, {
          composition_uid: orderKey,
          recorded_time: r.analyzeddate?.toISOString() || new Date().toISOString(),
          test_name: "Laboratory Tests",
          protocol: r.samplenumber,
          specimen_type: r.sampletype,
          specimen_collection_time: r.collectiondate?.toISOString(),
          specimen_id: r.samplenumber,
          overall_test_status: r.status === "released" ? "final" : r.status === "validated" ? "preliminary" : "registered",
          test_results: [] as LabTestAnalyte[],
          laboratory_name: facilityName,
          report_date: r.releaseddate?.toISOString() || r.analyzeddate?.toISOString() || new Date().toISOString(),
          source: "lims",
          sampleid: r.sampleid,
          orderid: orderKey,
          price: 50,
          currency: "USD",
          samples: [] as { sampleid: string; samplenumber: string; sampletype: string; collectiondate: string | null; barcode: string | null; labcategory: string | null }[],
        });
      }

      const order = orderMap.get(orderKey)!;
      
      // Track unique samples within this order
      if (!order.samples.find((s) => s.sampleid === r.sampleid)) {
        order.samples.push({
          sampleid: r.sampleid,
          samplenumber: r.samplenumber,
          sampletype: r.sampletype,
          collectiondate: r.collectiondate?.toISOString() || null,
          barcode: r.barcode,
          labcategory: r.labcategory,
        });
      }

      // Update overall status - if any result is not released, the order is not final
      const resultTestStatus = r.status === "released" ? "final" : r.status === "validated" ? "preliminary" : "registered";
      if (resultTestStatus !== "final") {
        order.overall_test_status = resultTestStatus;
      }

      const refRange =
        r.referencemin !== null && r.referencemax !== null
          ? `${r.referencemin} - ${r.referencemax}`
          : r.referencerange || undefined;

      const resultStatus = r.iscritical
        ? "critical"
        : r.isabormal
        ? "abnormal"
        : "normal";

      const resultFlag = r.iscritical
        ? "HH"
        : r.flag === "high" || r.flag === "H"
        ? "H"
        : r.flag === "low" || r.flag === "L"
        ? "L"
        : "N";

      order.test_results.push({
        analyte_name: r.testname,
        analyte_code: r.testcode,
        result_value: r.resultvalue || "-",
        result_unit: r.unit || undefined,
        reference_range: refRange,
        result_status: resultStatus,
        result_flag: resultFlag,
      });
    }

    const limsLabResults = Array.from(orderMap.values());

    // Debug: log the grouping
    console.log(`[lab-results] Grouped into ${limsLabResults.length} orders:`);
    for (const order of limsLabResults) {
      console.log(`  Order ${order.orderid}: ${order.samples.length} samples, ${order.test_results.length} test results`);
    }

    // Merge: LIMS results first (real data), then dummy data
    const allResults = [...limsLabResults, ...patientLabResults];

    return NextResponse.json({
      labResults: allResults.map((r) => ({
        ...r,
        price: r.price ?? 50,
        currency: r.currency ?? "USD",
      })),
      imagingResults: imagingResultsStore[patientid] || [],
      ecgResults: ecgResultsStore[patientid] || [],
    });
    });
  } catch (error) {
    console.error("Error fetching lab results:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/lab-results
 * Create a new lab result (dummy data storage)
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

    // Check workspace access
    const userWorkspaces2 = await getUserWorkspaces(user.userid);
    const membership2 = userWorkspaces2.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership2) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and lab technicians can create lab results
    if (membership2.role !== "doctor" && membership2.role !== "nurse") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { labResult } = body;

    // Create lab result record following openEHR structure
    const labResultRecord: LabTestResult = {
      composition_uid: `lab-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      recorded_time: new Date().toISOString(),
      
      // Test identification
      test_name: labResult.testName,
      test_name_code: labResult.testNameCode,
      protocol: labResult.protocol || `LAB-${Date.now()}`,
      
      // Specimen details
      specimen_type: labResult.specimenType,
      specimen_collection_time: labResult.specimenCollectionTime,
      specimen_received_time: labResult.specimenReceivedTime,
      specimen_id: labResult.specimenId,
      
      // Overall test status
      overall_test_status: labResult.overallTestStatus || "final",
      
      // Clinical information
      clinical_information_provided: labResult.clinicalInformation,
      
      // Test results (analytes)
      test_results: labResult.testResults || [],
      
      // Interpretation
      conclusion: labResult.conclusion,
      test_diagnosis: labResult.testDiagnosis,
      
      // Metadata
      laboratory_name: labResult.laboratoryName,
      reported_by: labResult.reportedBy || user.name || user.email,
      verified_by: labResult.verifiedBy,
      report_date: new Date().toISOString(),
    };

    // Store in memory (initialize array if doesn't exist)
    if (!labResultsStore[patientid]) {
      labResultsStore[patientid] = [];
    }
    labResultsStore[patientid].unshift(labResultRecord); // Add to beginning

    console.log("✅ Lab result created (dummy data):", labResultRecord);

    return NextResponse.json(
      { 
        success: true,
        message: "Lab result created successfully",
        record: labResultRecord
      },
      { status: 201 }
    );
    });
  } catch (error) {
    console.error("Error creating lab result:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
