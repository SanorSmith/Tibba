import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceReports } from "@/lib/db/schema";
import { patients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

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
