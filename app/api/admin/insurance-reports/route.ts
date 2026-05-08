import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceReports } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      patientId,
      reportType,
      insuranceCompany,
      diagnosis,
      clinicalFindings,
      treatmentPlan,
      medications,
      investigations,
      prognosis,
      workStatus,
      recommendations,
    } = body;

    if (!patientId || !reportType || !insuranceCompany || !diagnosis) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Build comprehensive insurance report text
    const reportSections = [
      `INSURANCE REPORT`,
      `Report Type: ${reportType}`,
      `Insurance Company: ${insuranceCompany}`,
      ``,
      `DIAGNOSIS:`,
      diagnosis,
      ``,
    ];

    if (clinicalFindings) {
      reportSections.push(`CLINICAL FINDINGS:`, clinicalFindings, ``);
    }

    if (investigations) {
      reportSections.push(`INVESTIGATIONS & LAB RESULTS:`, investigations, ``);
    }

    if (medications) {
      reportSections.push(`MEDICATIONS PRESCRIBED:`, medications, ``);
    }

    if (treatmentPlan) {
      reportSections.push(`TREATMENT PLAN:`, treatmentPlan, ``);
    }

    if (prognosis) {
      reportSections.push(`PROGNOSIS:`, prognosis, ``);
    }

    if (workStatus) {
      reportSections.push(`WORK STATUS:`, workStatus, ``);
    }

    if (recommendations) {
      reportSections.push(`RECOMMENDATIONS:`, recommendations, ``);
    }

    const fullReportText = reportSections.join('\n');

    // Note: We're not creating an OpenEHR composition for insurance reports
    // All data is fetched from existing OpenEHR records (diagnoses, lab orders, etc.)
    // and combined with database data (medications with prices)
    
    // Save to database
    const [report] = await db
      .insert(insuranceReports)
      .values({
        patientid: patientId,
        reporttype: reportType,
        insurancecompany: insuranceCompany,
        diagnosis,
        clinicalfindings: clinicalFindings || null,
        treatmentplan: treatmentPlan || null,
        medications: medications || null,
        investigations: investigations || null,
        prognosis: prognosis || null,
        workstatus: workStatus || null,
        recommendations: recommendations || null,
        reportdata: body, // Store full report as JSON
      })
      .returning();

    return NextResponse.json({
      success: true,
      reportId: report.reportid,
      message: "Insurance report created successfully",
    });
  } catch (error) {
    console.error("[Insurance Reports API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create insurance report" },
      { status: 500 }
    );
  }
}
