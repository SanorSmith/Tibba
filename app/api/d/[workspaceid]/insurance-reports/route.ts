import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceReports } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { workspaceusers } from "@/lib/db/tables/workspace";
import { eq, and } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function POST(
  req: NextRequest,
  { params }: { params: { workspaceid: string } }
) {
  try {
    const workspaceid = params.workspaceid;
    
    // Verify user has access to this workspace
    const user = await getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const [membership] = await db
      .select()
      .from(workspaceusers)
      .where(
        and(
          eq(workspaceusers.workspaceid, workspaceid),
          eq(workspaceusers.userid, user.userid)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "Not a workspace member" },
        { status: 403 }
      );
    }

    // Check if user has appropriate role (administrator, pharmacist, finance_manager)
    const allowedRoles = ["administrator", "pharmacist", "finance_manager", "doctor", "receptionist"];
    if (!allowedRoles.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to create insurance reports" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      patientId,
      reportType,
      insuranceCompany,
      policyNumber,
      groupNumber,
      policyHolder,
      coverageType,
      coveragePercentage,
      policyEffectiveDate,
      policyExpirationDate,
      primaryInsurance,
      providerName,
      providerId,
      department,
      requestingPhysician,
      physicianNPI,
      providerPhone,
      providerEmail,
      diagnosis,
      clinicalFindings,
      medicalHistory,
      currentSymptoms,
      diagnosticFindings,
      medicalNecessity,
      alternativeTreatments,
      conservativeTreatments,
      treatmentPlan,
      medications,
      investigations,
      supportingDocuments,
      estimatedCost,
      urgency,
      requestedServiceDate,
      expectedReviewTime,
      authorizationExpiration,
      specialConsiderations,
      workStatus,
      recommendations,
      // New fields from sample report
      requestId,
      dateSubmitted,
      status,
      priority,
      serviceType,
      cptCode,
      serviceDescription,
      icd10Code,
      diagnosisDescription,
      requestedQuantity,
      facility,
      scheduledDate,
      totalEstimatedCost,
      insuranceCoverageAmount,
      patientResponsibilityAmount,
      physicianSignature,
      physicianSpecialty,
      licenseNumber,
      certificationDate,
      hospitalAdministratorSignature,
      hospitalAdministratorName,
      hospitalAdministratorTitle,
      hospitalAuthorizationDate,
      hospitalContactName,
      hospitalContactTitle,
      hospitalContactPhone,
      hospitalContactEmail,
      insuranceCompanyContactName,
      insuranceCompanyContactPhone,
      insuranceCompanyContactEmail,
    } = body;

    if (!patientId || !reportType || !insuranceCompany || !diagnosis) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Build comprehensive insurance report text
    const reportSections = [
      `INSURANCE PRE-APPROVAL REQUEST`,
      `Request ID: ${requestId || 'N/A'}`,
      `Date Submitted: ${dateSubmitted || new Date().toISOString().split('T')[0]}`,
      `Status: ${status || 'Pending Review'}`,
      `Priority: ${priority || 'Standard'}`,
      ``,
      `REPORT TYPE: ${reportType}`,
      `Insurance Company: ${insuranceCompany}`,
      ``,
      `DIAGNOSIS:`,
      diagnosis,
      ``,
    ];

    // Add requested services information
    if (serviceType) {
      reportSections.push(`REQUESTED SERVICES:`, `Service Type: ${serviceType}`);
      if (cptCode) reportSections.push(`CPT Code: ${cptCode}`);
      if (icd10Code) reportSections.push(`ICD-10 Code: ${icd10Code}`);
      if (requestedQuantity) reportSections.push(`Requested Quantity: ${requestedQuantity}`);
      if (facility) reportSections.push(`Facility: ${facility}`);
      if (scheduledDate) reportSections.push(`Scheduled Date: ${scheduledDate}`);
      if (serviceDescription) reportSections.push(`Service Description:`, serviceDescription);
      if (diagnosisDescription) reportSections.push(`Diagnosis Description:`, diagnosisDescription);
      reportSections.push(``);
    }

    if (clinicalFindings) {
      reportSections.push(`CLINICAL FINDINGS:`, clinicalFindings, ``);
    }

    if (medicalHistory) {
      reportSections.push(`MEDICAL HISTORY:`, medicalHistory, ``);
    }

    if (currentSymptoms) {
      reportSections.push(`CURRENT SYMPTOMS:`, currentSymptoms, ``);
    }

    if (diagnosticFindings) {
      reportSections.push(`DIAGNOSTIC FINDINGS:`, diagnosticFindings, ``);
    }

    if (medicalNecessity) {
      reportSections.push(`MEDICAL NECESSITY:`, medicalNecessity, ``);
    }

    if (alternativeTreatments) {
      reportSections.push(`ALTERNATIVE TREATMENTS CONSIDERED:`, alternativeTreatments, ``);
    }

    if (conservativeTreatments) {
      reportSections.push(`CONSERVATIVE TREATMENTS TRIED:`, conservativeTreatments, ``);
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

    if (supportingDocuments) {
      reportSections.push(`SUPPORTING DOCUMENTATION:`, supportingDocuments, ``);
    }

    // Add cost breakdown information
    if (totalEstimatedCost || insuranceCoverageAmount || patientResponsibilityAmount) {
      reportSections.push(`COST BREAKDOWN:`);
      if (totalEstimatedCost) reportSections.push(`Total Estimated Cost: ${totalEstimatedCost}`);
      if (insuranceCoverageAmount) reportSections.push(`Insurance Coverage: ${insuranceCoverageAmount}`);
      if (patientResponsibilityAmount) reportSections.push(`Patient Responsibility: ${patientResponsibilityAmount}`);
      reportSections.push(``);
    }

    if (estimatedCost) {
      reportSections.push(`ESTIMATED COST:`, estimatedCost, ``);
    }

    if (urgency) {
      reportSections.push(`URGENCY:`, urgency, ``);
    }

    if (requestedServiceDate) {
      reportSections.push(`REQUESTED SERVICE DATE:`, requestedServiceDate, ``);
    }

    if (expectedReviewTime) {
      reportSections.push(`EXPECTED REVIEW TIME:`, expectedReviewTime, ``);
    }

    if (authorizationExpiration) {
      reportSections.push(`AUTHORIZATION EXPIRATION:`, authorizationExpiration, ``);
    }

    if (specialConsiderations) {
      reportSections.push(`SPECIAL CONSIDERATIONS:`, specialConsiderations, ``);
    }

    // Add provider certification information
    if (physicianSignature || physicianSpecialty || licenseNumber || certificationDate) {
      reportSections.push(`PROVIDER CERTIFICATION:`);
      if (physicianSignature) reportSections.push(`Physician Signature: ${physicianSignature}`);
      if (physicianSpecialty) reportSections.push(`Specialty: ${physicianSpecialty}`);
      if (licenseNumber) reportSections.push(`License Number: ${licenseNumber}`);
      if (certificationDate) reportSections.push(`Certification Date: ${certificationDate}`);
      reportSections.push(``);
    }

    // Add hospital authorization information
    if (hospitalAdministratorSignature || hospitalAdministratorName || hospitalAdministratorTitle || hospitalAuthorizationDate) {
      reportSections.push(`HOSPITAL AUTHORIZATION:`);
      if (hospitalAdministratorSignature) reportSections.push(`Administrator Signature: ${hospitalAdministratorSignature}`);
      if (hospitalAdministratorName) reportSections.push(`Administrator Name: ${hospitalAdministratorName}`);
      if (hospitalAdministratorTitle) reportSections.push(`Title: ${hospitalAdministratorTitle}`);
      if (hospitalAuthorizationDate) reportSections.push(`Authorization Date: ${hospitalAuthorizationDate}`);
      reportSections.push(``);
    }

    // Add contact information
    if (hospitalContactName || hospitalContactPhone || hospitalContactEmail) {
      reportSections.push(`HOSPITAL CONTACT:`);
      if (hospitalContactName) reportSections.push(`Name: ${hospitalContactName}`);
      if (hospitalContactTitle) reportSections.push(`Title: ${hospitalContactTitle}`);
      if (hospitalContactPhone) reportSections.push(`Phone: ${hospitalContactPhone}`);
      if (hospitalContactEmail) reportSections.push(`Email: ${hospitalContactEmail}`);
      reportSections.push(``);
    }

    if (insuranceCompanyContactName || insuranceCompanyContactPhone || insuranceCompanyContactEmail) {
      reportSections.push(`INSURANCE COMPANY CONTACT:`);
      if (insuranceCompanyContactName) reportSections.push(`Name: ${insuranceCompanyContactName}`);
      if (insuranceCompanyContactPhone) reportSections.push(`Phone: ${insuranceCompanyContactPhone}`);
      if (insuranceCompanyContactEmail) reportSections.push(`Email: ${insuranceCompanyContactEmail}`);
      reportSections.push(``);
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
        workstatus: workStatus || null,
        recommendations: recommendations || null,
        reportdata: body, // Store full report as JSON including all new fields
      })
      .returning();

    return NextResponse.json({
      success: true,
      reportId: report.reportid,
      message: "Insurance pre-approval report created successfully",
    });
    });
  } catch (error) {
    console.error("[Insurance Reports API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create insurance report" },
      { status: 500 }
    );
  }
}
