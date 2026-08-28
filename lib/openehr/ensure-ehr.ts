/**
 * Ensure patient has a valid EHR in OpenEHR
 * If patient.ehrid exists in database but not in OpenEHR, create EHR with same ID
 * If patient has no ehrid, create a new one and update database
 */

import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, createOpenEHREHR, checkEHRExists } from "./openehr";
import { withTenant } from "@/lib/db/tenant";

export interface EnsureEHROptions {
  /**
   * Force recreate EHR even if it exists
   */
  forceRecreate?: boolean;
  /**
   * Subject ID to use when creating new EHR (defaults to patient.nationalid or patient.patientid)
   */
  subjectId?: string;
}

/**
 * Ensure patient has a valid EHR in OpenEHR
 * 
 * @param patientId - Patient UUID from database
 * @param options - Optional configuration
 * @returns The valid EHR ID
 */
/**
 * Write the EHR id back onto the patient.
 *
 * This must run inside the patient's own facility. Callers reach here from
 * handlers wrapped in withoutTenant - they make EHRbase HTTP calls and must
 * not hold a database transaction across them - and the patients UPDATE policy
 * is `workspaceid = current_setting(...) OR workspaceid IS NULL`. With no
 * tenant set neither holds, so the update matched zero rows and threw nothing.
 *
 * The effect was invisible and expensive: a new EHR was created, the
 * composition written into it, and the patient went on pointing at the old one.
 * The order list walks patients by their stored ehrid, so a referred test order
 * could never be found - it lived under an EHR nobody was looking at.
 *
 * A zero-row update is logged loudly rather than passed over, because that
 * silence is what hid this.
 */
async function saveEhrId(
  patientId: string,
  workspaceId: string | null,
  ehrId: string,
): Promise<void> {
  const write = async () => {
    const rows = await db
      .update(patients)
      .set({ ehrid: ehrId })
      .where(eq(patients.patientid, patientId))
      .returning({ id: patients.patientid });
    if (rows.length === 0) {
      console.error(
        `[EnsureEHR] patient ${patientId} was NOT updated to ehrid ${ehrId} - the ` +
        `row-level security policy matched nothing, so orders written to this ` +
        `EHR will not be findable under this patient.`,
      );
    }
  };
  return workspaceId ? withTenant(workspaceId, write) : write();
}

export async function ensurePatientEHR(
  patientId: string,
  options: EnsureEHROptions = {}
): Promise<string> {
  const { forceRecreate = false, subjectId } = options;

  // 1. Get patient from database
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.patientid, patientId))
    .limit(1);

  if (!patient) {
    throw new Error(`Patient ${patientId} not found in database`);
  }

  console.log(`[EnsureEHR] Processing patient: ${patient.firstname} ${patient.lastname}`);
  console.log(`[EnsureEHR] Database EHR ID: ${patient.ehrid || 'NULL'}`);
  console.log(`[EnsureEHR] National ID: ${patient.nationalid || 'NULL'}`);

  let ehrId: string | null = null;

  // 2. If patient has stored ehrid, check if it exists in OpenEHR by direct EHR lookup
  if (patient.ehrid && !forceRecreate) {
    try {
      console.log(`[EnsureEHR] Checking if EHR exists in OpenEHR: ${patient.ehrid}`);
      
      // Check if EHR exists by making a direct request to the EHR endpoint
      // This is more reliable than searching by subject ID
      const ehrExists = await checkEHRExists(patient.ehrid);
      
      if (ehrExists) {
        console.log(`[EnsureEHR] ✅ EHR exists in OpenEHR: ${patient.ehrid}`);
        return patient.ehrid;
      } else {
        console.log(`[EnsureEHR] ❌ EHR not found in OpenEHR: ${patient.ehrid}`);
        console.log(`[EnsureEHR] Will create new EHR`);
      }
    } catch (error) {
      console.log(`[EnsureEHR] ❌ Error checking EHR existence: ${error}`);
      console.log(`[EnsureEHR] Will create new EHR`);
    }
  }

  // 3. If no EHR exists or force recreate, create a new one
  const subjectToUse = subjectId || patient.nationalid || patient.patientid;
  console.log(`[EnsureEHR] Creating new EHR with subject: ${subjectToUse}`);
  
  try {
    ehrId = await createOpenEHREHR(subjectToUse);
    console.log(`[EnsureEHR] ✅ Created new EHR: ${ehrId}`);
    
    // Update patient record with new EHR ID
    await saveEhrId(patientId, patient.workspaceid, ehrId);
    
    console.log(`[EnsureEHR] ✅ Updated patient.ehrid to: ${ehrId}`);
    return ehrId;
    
  } catch (error) {
    // Handle 409 conflict - EHR with this subject already exists
    if (error instanceof Error && error.message.includes('409')) {
      console.log(`[EnsureEHR] ⚠️ EHR with subject ${subjectToUse} already exists (409 conflict)`);
      console.log(`[EnsureEHR] Trying to find existing EHR by subject ID`);
      
      try {
        // Try to find the existing EHR by subject ID
        const existingEhrId = await getOpenEHREHRBySubjectId(subjectToUse);
        if (existingEhrId) {
          console.log(`[EnsureEHR] ✅ Found existing EHR: ${existingEhrId}`);
          
          // Update patient record with the existing EHR ID
          await saveEhrId(patientId, patient.workspaceid, existingEhrId);
          
          console.log(`[EnsureEHR] ✅ Updated patient.ehrid to existing EHR: ${existingEhrId}`);
          return existingEhrId;
        }
      } catch (findError) {
        console.error(`[EnsureEHR] ❌ Failed to find existing EHR: ${findError}`);
      }
    }
    
    console.error(`[EnsureEHR] ❌ Failed to create EHR: ${error}`);
    throw new Error(`Failed to create EHR for patient ${patientId}: ${error}`);
  }
}

/**
 * Batch ensure EHRs for multiple patients
 * 
 * @param patientIds - Array of patient UUIDs
 * @param options - Optional configuration
 * @returns Map of patientId to ehrId
 */
export async function ensurePatientsEHRs(
  patientIds: string[],
  options: EnsureEHROptions = {}
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const errors: string[] = [];

  console.log(`[EnsureEHR] Processing ${patientIds.length} patients`);

  for (const patientId of patientIds) {
    try {
      const ehrId = await ensurePatientEHR(patientId, options);
      results.set(patientId, ehrId);
    } catch (error) {
      const errorMsg = `Failed to ensure EHR for patient ${patientId}: ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  if (errors.length > 0) {
    console.log(`[EnsureEHR] Completed with ${errors.length} errors`);
    errors.forEach(error => console.log(`[EnsureEHR] - ${error}`));
  } else {
    console.log(`[EnsureEHR] ✅ Successfully processed all ${patientIds.length} patients`);
  }

  return results;
}
