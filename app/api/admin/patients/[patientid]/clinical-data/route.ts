import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pharmacyOrders, pharmacyOrderItems, drugs, patients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, createOpenEHREHR } from "@/lib/openehr";
import { getUser } from "@/lib/user";

// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientid: string }> }
) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientid } = await params;

    // Fetch medications from pharmacy orders
    const medicationOrders = await db
      .select({
        drugName: pharmacyOrderItems.drugname,
        strength: drugs.strength,
        form: drugs.form,
        quantity: pharmacyOrderItems.quantity,
        dosage: pharmacyOrderItems.dosage,
        notes: pharmacyOrderItems.notes,
        unitPrice: pharmacyOrderItems.unitprice,
      })
      .from(pharmacyOrderItems)
      .innerJoin(pharmacyOrders, eq(pharmacyOrderItems.orderid, pharmacyOrders.orderid))
      .leftJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
      .where(eq(pharmacyOrders.patientid, patientid))
      .orderBy(desc(pharmacyOrders.createdat))
      .limit(20);

    // Return medications as structured data for table display
    const medications = medicationOrders.map(med => ({
      name: med.drugName,
      dose: med.dosage || `${med.strength || ""} ${med.form || ""}`.trim() || "-",
      price: parseFloat(med.unitPrice || "0"),
    }));

    // Get patient's EHR ID from database
    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);
    
    let ehrId = patient?.ehrid;
    
    console.log("Patient ID:", patientid);
    console.log("EHR ID from database:", ehrId);
    
    // If no EHR exists, create one automatically
    if (!ehrId) {
      console.log("No EHR found in database, creating new EHR for patient...");
      try {
        ehrId = await createOpenEHREHR(patientid);
        console.log("Created new EHR:", ehrId);
        
        // Update patient record with new EHR ID
        await db
          .update(patients)
          .set({ ehrid: ehrId })
          .where(eq(patients.patientid, patientid));
      } catch (error) {
        console.error("Failed to create EHR:", error);
        // Return medications only if EHR creation fails
        return NextResponse.json({
          diagnoses: [],
          clinicalFindings: "",
          medications,
          labOrders: [],
          investigations: "",
          treatmentPlan: "",
          _debug: {
            patientId: patientid,
            ehrId: null,
            message: "Failed to create EHR for this patient"
          }
        });
      }
    }

    // Try a very broad query to find ANY data in the EHR
    const broadQuery = `
      SELECT e/ehr_id/value as ehr_id, e/time_created/value as time_created
      FROM EHR e
      WHERE e/ehr_id/value = '${ehrId}'
    `;

    // Try to list all compositions - use simpler query without ORDER BY on potentially missing field
    const compositionsQuery = `
      SELECT c/uid/value
      FROM EHR e[ehr_id/value='${ehrId}']
      CONTAINS COMPOSITION c
    `;

    // Execute queries
    const ehrbaseUrl = `${process.env.EHRBASE_URL}/ehrbase`;
    const basicAuth = Buffer.from(`${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`).toString("base64");

    const [broadRes, compositionsRes] = await Promise.all([
      fetch(`${ehrbaseUrl}/rest/openehr/v1/query/aql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.EHRBASE_API_KEY || "",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: JSON.stringify({ q: broadQuery }),
      }),
      fetch(`${ehrbaseUrl}/rest/openehr/v1/query/aql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.EHRBASE_API_KEY || "",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: JSON.stringify({ q: compositionsQuery }),
      }),
    ]);

    const broadData = broadRes.ok ? await broadRes.json() : { rows: [] };
    
    let compositionsData = { rows: [] };
    if (compositionsRes.ok) {
      compositionsData = await compositionsRes.json();
    } else {
      const errorText = await compositionsRes.text();
      console.error("Compositions Query Failed:", compositionsRes.status, compositionsRes.statusText);
      console.error("Error Response:", errorText);
    }

    // Debug: Log the responses
    console.log("=== BROAD QUERY DEBUG ===");
    console.log("Broad Query Response OK:", broadRes.ok);
    console.log("Broad Query Data:", JSON.stringify(broadData, null, 2));
    console.log("=== COMPOSITIONS DEBUG ===");
    console.log("Compositions Response OK:", compositionsRes.ok);
    console.log("Compositions Data:", JSON.stringify(compositionsData, null, 2));
    console.log("Compositions Rows Count:", compositionsData.rows?.length || 0);

    // Extract and format data from compositions
    const compositions = compositionsData.rows || [];
    const diagnoses: string[] = [];
    const clinicalFindings: string[] = [];
    const labOrders: any[] = [];

    // If we have composition UIDs, fetch full composition details
    if (compositions.length > 0) {
      // Fetch full composition data for each UID
      const compositionDetails = await Promise.all(
        compositions.map(async (row: any) => {
          const compositionUid = row[0];
          try {
            const compRes = await fetch(
              `${ehrbaseUrl}/rest/openehr/v1/ehr/${ehrId}/composition/${compositionUid}?format=FLAT`,
              {
                headers: {
                  "Content-Type": "application/json",
                  "X-API-Key": process.env.EHRBASE_API_KEY || "",
                  "Authorization": `Basic ${basicAuth}`,
                },
              }
            );
            if (compRes.ok) {
              return await compRes.json();
            }
            return null;
          } catch (error) {
            console.error(`Error fetching composition ${compositionUid}:`, error);
            return null;
          }
        })
      );

      // Process each composition detail
      console.log("=== PROCESSING COMPOSITIONS ===");
      console.log("Total compositions fetched:", compositionDetails.length);
      console.log("Null compositions:", compositionDetails.filter(c => !c).length);
      
      compositionDetails.forEach((comp: any, index: number) => {
        if (!comp) return;

        // Determine template type from keys
        const keys = Object.keys(comp);
        const templateKey = keys.find(k => k.startsWith('template_'));
        const templateName = templateKey?.split('/')[0] || 'unknown';
        
        // Extract data based on template type
        if (templateName.includes('clinical_encounter')) {
          const startTime = comp[`${templateName}/context/start_time`] || '';
          
          // Extract diagnosis
          const diagnosisName = comp[`${templateName}/problem_diagnosis/problem_diagnosis_name`];
          const clinicalDesc = comp[`${templateName}/problem_diagnosis/clinical_description`];
          if (diagnosisName) {
            diagnoses.push(diagnosisName);
            if (clinicalDesc) {
              clinicalFindings.push(`${diagnosisName}: ${clinicalDesc}`);
            }
          }
          
          // Extract service requests (lab orders)
          const serviceName = comp[`${templateName}/service_request/request/service_name|other`];
          const serviceDesc = comp[`${templateName}/service_request/request/description`];
          if (serviceName) {
            labOrders.push({
              testName: serviceName,
              reason: serviceDesc || '',
              requestId: '',
              orderTime: startTime,
              serviceType: 'service_request',
            });
          }
          
          // Extract medications
          const medicationItem = comp[`${templateName}/medication_order/order:0/medication_item`];
          const route = comp[`${templateName}/medication_order/order:0/route:0`];
          const directions = comp[`${templateName}/medication_order/order:0/overall_directions_description`];
          if (medicationItem) {
            labOrders.push({
              testName: `Medication: ${medicationItem}`,
              reason: directions || route || '',
              requestId: '',
              orderTime: startTime,
              serviceType: 'medication',
            });
          }
        } else if (templateName.includes('care_plan')) {
          const diagnosisName = comp[`${templateName}/problem_diagnosis/problem_diagnosis_name`];
          const clinicalDesc = comp[`${templateName}/problem_diagnosis/clinical_description`];
          
          if (diagnosisName) {
            diagnoses.push(diagnosisName);
            if (clinicalDesc) {
              clinicalFindings.push(`Care Plan - ${diagnosisName}: ${clinicalDesc}`);
            }
          }
        }
      });
    }

    console.log("Processed Diagnoses:", diagnoses.length);
    console.log("Processed Findings:", clinicalFindings.length);
    console.log("Processed Lab Orders:", labOrders.length);

    return NextResponse.json({
      diagnoses,
      clinicalFindings: clinicalFindings.join("\n\n"),
      medications,
      labOrders,
      investigations: "",
      treatmentPlan: "",
      // Debug info
      _debug: {
        ehrId,
        broadQueryResult: broadData,
        compositionsCount: compositions.length,
        diagnosesCount: diagnoses.length,
        findingsCount: clinicalFindings.length,
        labOrdersCount: labOrders.length,
        sampleCompositions: compositions.slice(0, 5).map((row: any) => ({
          uid: row[0],
        })),
      }
    });

  } catch (error) {
    console.error("[Patient Clinical Data API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient clinical data" },
      { status: 500 }
    );
  }
}
