import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pharmacyOrders, pharmacyOrderItems, drugs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getOpenEHREHRBySubjectId, createOpenEHREHR } from "@/lib/openehr";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientid: string }> }
) {
  try {
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

    // Get patient's EHR from OpenEHR for diagnoses
    let ehrId = await getOpenEHREHRBySubjectId(patientid);
    
    console.log("Patient ID:", patientid);
    console.log("EHR ID found:", ehrId);
    
    // If no EHR exists, create one automatically
    if (!ehrId) {
      console.log("No EHR found, creating new EHR for patient...");
      try {
        ehrId = await createOpenEHREHR(patientid);
        console.log("Created new EHR:", ehrId);
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

    // Fetch clinical encounters and problem diagnoses
    const diagnosesQuery = `
      SELECT
        e/data[at0001]/items[at0002]/value/value as diagnosis_name,
        e/data[at0001]/items[at0009]/value/value as clinical_description
      FROM EHR e[ehr_id/value='${ehrId}']
      CONTAINS EVALUATION e[openEHR-EHR-EVALUATION.problem_diagnosis.v1]
      ORDER BY e/context/start_time/value DESC
      LIMIT 10
    `;

    // Fetch clinical findings from encounters
    const findingsQuery = `
      SELECT
        o/data[at0001]/events[at0002]/data[at0003]/items[at0004]/value/value as story
      FROM EHR e[ehr_id/value='${ehrId}']
      CONTAINS OBSERVATION o[openEHR-EHR-OBSERVATION.story.v1]
      ORDER BY o/context/start_time/value DESC
      LIMIT 5
    `;

    // Fetch all instructions (lab orders, medications, procedures, etc.)
    const labOrdersQuery = `
      SELECT
        i/name/value as instruction_name,
        i/narrative/value as narrative,
        c/context/start_time/value as order_time,
        c/name/value as composition_name
      FROM EHR e[ehr_id/value='${ehrId}']
      CONTAINS COMPOSITION c
      CONTAINS INSTRUCTION i
      ORDER BY c/context/start_time/value DESC
      LIMIT 50
    `;

    // Execute queries in parallel
    const ehrbaseUrl = `${process.env.EHRBASE_URL}/ehrbase`;
    const basicAuth = Buffer.from(`${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`).toString("base64");
    
    const [diagnosesRes, findingsRes, labOrdersRes] = await Promise.all([
      fetch(`${ehrbaseUrl}/rest/openehr/v1/query/aql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.EHRBASE_API_KEY || "",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: JSON.stringify({ q: diagnosesQuery }),
      }),
      fetch(`${ehrbaseUrl}/rest/openehr/v1/query/aql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.EHRBASE_API_KEY || "",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: JSON.stringify({ q: findingsQuery }),
      }),
      fetch(`${ehrbaseUrl}/rest/openehr/v1/query/aql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": process.env.EHRBASE_API_KEY || "",
          "Authorization": `Basic ${basicAuth}`,
        },
        body: JSON.stringify({ q: labOrdersQuery }),
      }),
    ]);

    const diagnosesData = diagnosesRes.ok ? await diagnosesRes.json() : { rows: [] };
    const findingsData = findingsRes.ok ? await findingsRes.json() : { rows: [] };
    
    // Check lab orders response
    if (!labOrdersRes.ok) {
      console.error("Lab Orders Query Failed:", labOrdersRes.status, labOrdersRes.statusText);
      const errorText = await labOrdersRes.text();
      console.error("Lab Orders Error:", errorText);
    }
    const labOrdersData = labOrdersRes.ok ? await labOrdersRes.json() : { rows: [] };

    // Debug: Log the lab orders response
    console.log("=== LAB ORDERS DEBUG ===");
    console.log("Lab Orders Response OK:", labOrdersRes.ok);
    console.log("Lab Orders Data:", JSON.stringify(labOrdersData, null, 2));
    console.log("Lab Orders Rows Count:", labOrdersData.rows?.length || 0);

    // Extract and format data
    const diagnoses = diagnosesData.rows?.map((row: any) => row[0]) || [];
    const clinicalFindings = findingsData.rows?.map((row: any) => row[0]).join("\n\n") || "";
    
    // Format lab orders/service requests
    const allServices = labOrdersData.rows || [];
    console.log("All Service Requests Count:", allServices.length);
    
    // Map instructions (lab orders, medications, x-rays, procedures, etc.)
    const labOrders = allServices
      .map((row: any) => ({
        testName: row[1] || row[0] || "Unknown Service", // narrative or instruction_name
        reason: row[0] || "", // instruction_name
        requestId: "",
        orderTime: row[2] || "",
        serviceType: row[3] || "", // composition name to identify type
      }))
      .slice(0, 50); // Limit to 50 results
    
    console.log("Service Requests to display:", labOrders.length);
    console.log("Sample services:", labOrders.slice(0, 3));

    return NextResponse.json({
      diagnoses,
      clinicalFindings,
      medications,
      labOrders,
      investigations: "", // Can be populated from lab results if available
      treatmentPlan: "", // Can be populated from care plans if available
      // Debug info
      _debug: {
        labOrdersQueryOk: labOrdersRes.ok,
        labOrdersRowCount: labOrdersData.rows?.length || 0,
        allServicesCount: allServices.length,
        labOrdersCount: labOrders.length,
        sampleServices: allServices.slice(0, 3).map((row: any) => ({
          serviceName: row[0],
          reason: row[1],
          description: row[2],
          orderTime: row[3],
          compositionName: row[4]
        }))
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
