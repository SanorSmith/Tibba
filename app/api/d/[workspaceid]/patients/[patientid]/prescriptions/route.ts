import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { patients, pharmacyOrders, pharmacyOrderItems, drugs, workspaces as workspacesTable } from "@/lib/db/schema";
import { eq, ilike } from "drizzle-orm";
import { UserWorkspace } from "@/lib/db/tables/workspace";
import { getOpenEHREHRBySubjectId, createOpenEHRComposition, getOpenEHRPrescriptions } from "@/lib/openehr/openehr";
import { ensurePatientEHR } from "@/lib/openehr/ensure-ehr";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { recordCompositionOwner } from "@/lib/openehr/composition-ownership";

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/prescriptions
 * Retrieve prescription/medication orders for a patient from OpenEHR via AQL
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    // No tenant: this reads `patients` (shared-read since 0068) and then
    // calls EHRbase. Holding a transaction across those HTTP calls buys no
    // isolation and keeps a connection checked out. The POST below writes a
    // facility-scoped row and keeps its tenant.

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors and pharmacists can view prescriptions
    if (membership.role !== "doctor" && membership.role !== "pharmacist" && membership.role !== "administrator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Find EHR by National ID or patient UUID
    let ehrId: string | null = null;
    if (patient.nationalid) {
      ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    }
    if (!ehrId) {
      ehrId = await getOpenEHREHRBySubjectId(patientid);
    }

    if (!ehrId) {
      return NextResponse.json({ prescriptions: [] }, { status: 200 });
    }

    const prescriptions = await getOpenEHRPrescriptions(ehrId);
  

    return NextResponse.json({ prescriptions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching prescriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch prescriptions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/prescriptions
 * Create a new prescription/medication order in OpenEHR (clinical encounter template)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, patientid } = await params;
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only doctors can create prescriptions
    if (membership.role !== "doctor") {
      return NextResponse.json(
        { error: "Only doctors can create prescriptions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Support both single prescription and multiple prescriptions
    const prescriptions = body.prescriptions || (body.prescription ? [body.prescription] : []);

    // Where the prescription is to be dispensed. Until now a prescription was
    // stamped with the prescriber's own facility and stayed there, so a doctor
    // could not send one to a pharmacy at all - the reader could only ever be
    // the facility that wrote it. Falling back to the prescriber's facility
    // keeps the old behaviour when the caller sends no destination.
    const dispensingWorkspaceId: string | null =
      body.target_pharmacy_workspace_id ?? null;
    
    if (prescriptions.length === 0) {
      return NextResponse.json(
        { error: "No prescriptions provided" },
        { status: 400 }
      );
    }

    // Only a pharmacy workspace can dispense. Enforced here and not just in
    // the form, because an order filed against a hospital is one no pharmacy
    // will ever read - the state Salam ALI's first two prescriptions sat in.
    const dispensingTargetId = dispensingWorkspaceId ?? workspaceid;
    const [dispensingWorkspace] = await db
      .select({ type: workspacesTable.type, isactive: workspacesTable.isactive })
      .from(workspacesTable)
      .where(eq(workspacesTable.workspaceid, dispensingTargetId))
      .limit(1);

    if (
      !dispensingWorkspace ||
      !dispensingWorkspace.isactive ||
      String(dispensingWorkspace.type).toLowerCase() !== "pharmacy"
    ) {
      return NextResponse.json(
        {
          error:
            "A prescription has to be sent to a pharmacy. Choose the pharmacy that should dispense it.",
        },
        { status: 400 }
      );
    }

    // Validate all prescriptions
    for (const prescription of prescriptions) {
      if (
        !prescription.medicationItem ||
        !prescription.route ||
        !prescription.doseAmount ||
        !prescription.doseUnit ||
        !prescription.timingDirections
      ) {
        return NextResponse.json(
          {
            error:
              "All prescriptions must have: medication item, route, dose amount, dose unit and timing directions",
          },
          { status: 400 }
        );
      }
    }

    // Fetch patient to get National ID
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Ensure patient has a valid EHR in OpenEHR
    // This will create the EHR if it doesn't exist, using the stored ehrid if available
    const ehrId = await ensurePatientEHR(patientid);

    // ═══ DRUG INTERACTION CHECK ═══
    // Check for interactions between new prescriptions and existing medications
    try {
      const medicationNames = prescriptions.map((p: any) => ({
        name: p.medicationItem,
        genericName: p.activeIngredient || p.medicationItem,
      }));

      const interactionCheckResponse = await fetch(
        `${request.nextUrl.origin}/api/pharmacy/drug-interactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            drugs: medicationNames,
            patientId: patientid,
            workspaceId: workspaceid,
            checkAllergies: true,
          }),
        }
      );

      if (interactionCheckResponse.ok) {
        const interactionData = await interactionCheckResponse.json();
        
        // Log interaction check results
        console.log(`[Prescription] Checked ${medicationNames.length} medications for patient ${patientid}`);
        console.log(`[Prescription] Found ${interactionData.interactions?.length || 0} potential interactions`);
        
        if (interactionData.allergyWarnings > 0) {
          console.warn(`[Prescription] ⚠️ ALLERGY WARNINGS: ${interactionData.allergyWarnings}`);
        }
        
        if (interactionData.clinicalWarnings > 0) {
          console.warn(`[Prescription] ⚠️ CLINICAL WARNINGS: ${interactionData.clinicalWarnings}`);
        }

        // Check for critical interactions
        const criticalInteractions = interactionData.interactions?.filter(
          (i: any) => i.severity === "critical"
        ) || [];

        if (criticalInteractions.length > 0) {
          console.error(`[Prescription] 🚨 CRITICAL INTERACTIONS DETECTED: ${criticalInteractions.length}`);
          criticalInteractions.forEach((interaction: any) => {
            console.error(`  - ${interaction.drugs.join(" + ")}: ${interaction.description}`);
          });
          
          // Return warning but allow doctor to proceed (they can review and decide)
          return NextResponse.json(
            {
              error: "Critical drug interactions detected",
              interactions: interactionData.interactions,
              allergyWarnings: interactionData.allergyWarnings,
              clinicalWarnings: interactionData.clinicalWarnings,
              alternatives: interactionData.alternatives,
              message: "Please review the interactions before prescribing. Contact pharmacy if needed.",
            },
            { status: 409 } // 409 Conflict
          );
        }

        // Log non-critical warnings
        const warnings = interactionData.interactions?.filter(
          (i: any) => i.severity === "major" || i.severity === "moderate"
        ) || [];
        
        if (warnings.length > 0) {
          console.warn(`[Prescription] ⚠️ ${warnings.length} interaction warnings (non-critical)`);
        }
      }
    } catch (interactionError) {
      console.error("[Prescription] Error checking drug interactions:", interactionError);
      // Continue with prescription creation even if interaction check fails
    }

    // Create OpenEHR composition for each prescription
    const compositionUids: string[] = [];
    const errors: string[] = [];

    for (const prescription of prescriptions) {
      try {
        // Build FLAT composition data for medication_order section using v1 template
        const compositionData: Record<string, unknown> = {
      "template_clinical_encounter_v1/language|code": "en",
      "template_clinical_encounter_v1/language|terminology": "ISO_639-1",
      "template_clinical_encounter_v1/territory|code": "US",
      "template_clinical_encounter_v1/territory|terminology": "ISO_3166-1",
      "template_clinical_encounter_v1/composer|name":
        user.name || user.email || "Unknown",
      "template_clinical_encounter_v1/context/start_time":
        new Date().toISOString(),
      "template_clinical_encounter_v1/context/setting|code": "238",
      "template_clinical_encounter_v1/context/setting|value": "other care",
      "template_clinical_encounter_v1/context/setting|terminology": "openehr",
      "template_clinical_encounter_v1/category|code": "433",
      "template_clinical_encounter_v1/category|value": "event",
      "template_clinical_encounter_v1/category|terminology": "openehr",
    };

    // Core medication order fields
    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/medication_item"
    ] = prescription.medicationItem;
    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/route:0"
    ] = prescription.route;
    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/timing"
    ] = prescription.timingDirections;

    // Overall directions (narrative dosage)
    const overallDirectionsParts: string[] = [];
    if (prescription.doseAmount && prescription.doseUnit) {
      overallDirectionsParts.push(
        `${prescription.doseAmount} ${prescription.doseUnit}`
      );
    }
    if (prescription.route) {
      overallDirectionsParts.push(prescription.route);
    }
    if (prescription.directionDuration) {
      overallDirectionsParts.push(`for ${prescription.directionDuration}`);
    }
    if (prescription.asRequired) {
      overallDirectionsParts.push(
        `PRN${
          prescription.asRequiredCriterion
            ? ` ${prescription.asRequiredCriterion}`
            : ""
        }`
      );
    }

    const overallDirections = overallDirectionsParts.join(", ");

    compositionData[
      "template_clinical_encounter_v1/medication_order/order:0/overall_directions_description"
    ] = overallDirections;

    // NOTE: The current clinical encounter template in EHRbase does not
    // accept explicit FLAT paths for `as_required` or `direction_duration`
    // on medication_order. We encode those semantics only into the
    // overall_directions_description/narrative instead of sending the
    // dedicated fields, to avoid 400 "Could not consume Parts" errors.

    if (prescription.additionalInstruction) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/additional_instruction:0"
      ] = prescription.additionalInstruction;
    }

    if (prescription.clinicalIndication) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/clinical_indication:0"
      ] = prescription.clinicalIndication;
    }

    if (prescription.maximumDoseAmount) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/medication_safety/maximum_dose:0/maximum_amount|magnitude"
      ] = Number(prescription.maximumDoseAmount);
    }
    if (prescription.maximumDoseUnit) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/medication_safety/maximum_dose:0/maximum_amount|unit"
      ] = prescription.maximumDoseUnit;
    }

    if (prescription.dispenseInstruction) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/dispense_directions/dispense_instruction:0"
      ] = prescription.dispenseInstruction;
    }

    // Encode extended metadata into a structured comment so that
    // getOpenEHRPrescriptions can parse it back out and the UI can
    // show a rich details view.
    const commentParts: string[] = [];
    if (prescription.productName) {
      commentParts.push(`Product name: ${prescription.productName}`);
    }
    if (prescription.activeIngredient) {
      commentParts.push(`Active ingredient: ${prescription.activeIngredient}`);
    }
    if (prescription.usage) {
      commentParts.push(`Usage: ${prescription.usage}`);
    }
    if (prescription.validUntil) {
      commentParts.push(`Valid until: ${prescription.validUntil}`);
    }
    if (prescription.additionalInstruction) {
      commentParts.push(`Instructions: ${prescription.additionalInstruction}`);
    }
    if (membership.workspace?.name) {
      commentParts.push(`Issued from: ${membership.workspace.name}`);
    }
    if (prescription.comment) {
      commentParts.push(prescription.comment);
    }
    if (commentParts.length > 0) {
      compositionData[
        "template_clinical_encounter_v1/medication_order/order:0/comment"
      ] = commentParts.join(" | ");
    }

    // Narrative field
    compositionData[
      "template_clinical_encounter_v1/medication_order/narrative"
    ] =
      prescription.comment ||
      overallDirections ||
      "Prescription created from clinical encounter";

        const compositionUid = await createOpenEHRComposition(
          ehrId,
          "template_clinical_encounter_v1",
          compositionData
        );

        // Record the owning facility where it can be enforced. Without this
        // the only trace of who a composition belongs to is prose inside
        // the document, which a wording change would silently break.
        await recordCompositionOwner({
          compositionUid: compositionUid,
          workspaceId: workspaceid,
          patientId: patientid,
        });

        compositionUids.push(compositionUid);

        // ═══ SYNC TO PHARMACY DATABASE ═══
        // Create pharmacy order record so it appears in pharmacy app
        try {
          console.log(`[Prescription] Syncing to pharmacy database: ${prescription.medicationItem}`);
          
          // Create pharmacy order
          const [pharmacyOrder] = await db
            .insert(pharmacyOrders)
            .values({
              workspaceid: workspaceid,
              dispensingworkspaceid: dispensingTargetId,
              patientid: patientid,
              prescriberid: user.userid,
              status: "PENDING",
              source: "openehr",
              openehrorderid: compositionUid,
              priority: prescription.urgency || "routine",
              notes: prescription.comment || `Prescription: ${prescription.medicationItem}`,
              metadata: {
                prescriptionData: prescription,
                composerName: user.name || user.email,
                createdFrom: "patient-prescription-api",
              },
            })
            .returning();

          console.log(`[Prescription] ✅ Created pharmacy order: ${pharmacyOrder.orderid}`);

          // Try to find matching drug in database
          const [matchingDrug] = await db
            .select()
            .from(drugs)
            .where(ilike(drugs.name, `%${prescription.medicationItem}%`))
            .limit(1);

          // Create order item
          await db.insert(pharmacyOrderItems).values({
            orderid: pharmacyOrder.orderid,
            drugid: matchingDrug?.drugid || null,
            drugname: prescription.medicationItem,
            dosage: overallDirections,
            quantity: parseInt(prescription.doseAmount) || 1,
            status: "PENDING",
            notes: prescription.additionalInstruction || null,
          });

          console.log(`[Prescription] ✅ Created pharmacy order item for: ${prescription.medicationItem}`);
        } catch (syncError) {
          console.error(`[Prescription] ⚠️ Failed to sync to pharmacy database:`, syncError);
          // Don't fail the entire request - prescription is still in OpenEHR
        }
      } catch (error) {
        console.error(`[POST /prescriptions] Error creating composition for ${prescription.medicationItem}:`, error);
        errors.push(`Failed to create prescription for ${prescription.medicationItem}`);
      }
    }

    // Return results
    if (compositionUids.length === 0) {
      return NextResponse.json(
        { 
          error: "Failed to create any prescriptions in OpenEHR",
          details: errors 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `${compositionUids.length} prescription(s) created successfully in OpenEHR`,
        composition_uids: compositionUids,
        total: prescriptions.length,
        successful: compositionUids.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
    });
  } catch (error) {
    console.error("Error creating prescription:", error);
    return NextResponse.json(
      { error: "Failed to create prescription" },
      { status: 500 }
    );
  }
}
