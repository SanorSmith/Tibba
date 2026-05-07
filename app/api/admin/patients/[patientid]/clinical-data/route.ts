import { NextRequest, NextResponse } from "next/server";
import { getOpenEHREHRBySubjectId } from "@/lib/openehr/openehr";
import { db } from "@/lib/db";
import { pharmacyOrders, pharmacyOrderItems } from "@/lib/db/tables/pharmacy-orders";
import { drugs } from "@/lib/db/tables/pharmacy-drugs";
import { eq, desc } from "drizzle-orm";

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
      })
      .from(pharmacyOrderItems)
      .innerJoin(pharmacyOrders, eq(pharmacyOrderItems.orderid, pharmacyOrders.orderid))
      .leftJoin(drugs, eq(pharmacyOrderItems.drugid, drugs.drugid))
      .where(eq(pharmacyOrders.patientid, patientid))
      .orderBy(desc(pharmacyOrders.createdat))
      .limit(20);

    // Format medications list
    const medicationsList = medicationOrders.map(med => {
      const parts = [med.drugName];
      if (med.strength) parts.push(med.strength);
      if (med.form) parts.push(`(${med.form})`);
      if (med.dosage) parts.push(`- ${med.dosage}`);
      if (med.quantity > 1) parts.push(`x${med.quantity}`);
      if (med.notes) parts.push(`[${med.notes}]`);
      return parts.join(" ");
    });

    // Get patient's EHR from OpenEHR for diagnoses
    const ehrId = await getOpenEHREHRBySubjectId(patientid);
    
    if (!ehrId) {
      return NextResponse.json({
        diagnoses: [],
        clinicalFindings: "",
        medications: medicationsList,
        investigations: "",
        treatmentPlan: "",
      });
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

    // Execute queries in parallel
    const [diagnosesRes, findingsRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_EHRBASE_URL}/rest/openehr/v1/query/aql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(`${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`).toString("base64")}`,
        },
        body: JSON.stringify({ q: diagnosesQuery }),
      }),
      fetch(`${process.env.NEXT_PUBLIC_EHRBASE_URL}/rest/openehr/v1/query/aql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Basic ${Buffer.from(`${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`).toString("base64")}`,
        },
        body: JSON.stringify({ q: findingsQuery }),
      }),
    ]);

    const diagnosesData = diagnosesRes.ok ? await diagnosesRes.json() : { rows: [] };
    const findingsData = findingsRes.ok ? await findingsRes.json() : { rows: [] };

    // Extract and format data
    const diagnoses = diagnosesData.rows?.map((row: any) => row[0]) || [];
    const clinicalFindings = findingsData.rows?.map((row: any) => row[0]).join("\n\n") || "";

    return NextResponse.json({
      diagnoses,
      clinicalFindings,
      medications: medicationsList,
      investigations: "", // Can be populated from lab results if available
      treatmentPlan: "", // Can be populated from care plans if available
    });

  } catch (error) {
    console.error("[Patient Clinical Data API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient clinical data" },
      { status: 500 }
    );
  }
}
