import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceReports } from "@/lib/db/schema";
import { patients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const patientId = searchParams.get("patientId");

    let query = db
      .select({
        reportid: insuranceReports.reportid,
        patientid: insuranceReports.patientid,
        reporttype: insuranceReports.reporttype,
        insurancecompany: insuranceReports.insurancecompany,
        diagnosis: insuranceReports.diagnosis,
        createdat: insuranceReports.createdat,
        patientFirstName: patients.firstname,
        patientLastName: patients.lastname,
      })
      .from(insuranceReports)
      .leftJoin(patients, eq(insuranceReports.patientid, patients.patientid))
      .orderBy(desc(insuranceReports.createdat));

    if (patientId) {
      query = query.where(eq(insuranceReports.patientid, patientId)) as any;
    }

    const reports = await query.limit(100);

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[Insurance Reports List API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insurance reports" },
      { status: 500 }
    );
  }
}
