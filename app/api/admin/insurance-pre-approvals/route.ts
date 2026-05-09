import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insurancePreApprovals } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { eq, desc, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      patientid,
      insuranceid,
      patientinsuranceid,
      cpt_codes,
      icd10_codes,
      clinical_justification,
      requested_services,
      cost_breakdown,
      supporting_documents,
    } = body;

    if (!patientid || !insuranceid) {
      return NextResponse.json(
        { error: "Patient ID and Insurance ID are required" },
        { status: 400 }
      );
    }

    const [preApproval] = await db
      .insert(insurancePreApprovals)
      .values({
        patientid,
        insuranceid,
        patientinsuranceid,
        status: "pending",
        cpt_codes,
        icd10_codes,
        clinical_justification,
        requested_services,
        cost_breakdown,
        supporting_documents,
      })
      .returning();

    return NextResponse.json({
      success: true,
      preApprovalId: preApproval.preapprovalid,
      message: "Pre-approval request created successfully",
    });
  } catch (error) {
    console.error("[Insurance Pre-Approvals API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create pre-approval request" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const patientid = searchParams.get("patientid");
    const status = searchParams.get("status");

    let preApprovals;

    if (patientid && status) {
      preApprovals = await db
        .select()
        .from(insurancePreApprovals)
        .where(and(
          eq(insurancePreApprovals.patientid, patientid as string),
          eq(insurancePreApprovals.status, status)
        ))
        .orderBy(desc(insurancePreApprovals.request_date));
    } else if (patientid) {
      preApprovals = await db
        .select()
        .from(insurancePreApprovals)
        .where(eq(insurancePreApprovals.patientid, patientid as string))
        .orderBy(desc(insurancePreApprovals.request_date));
    } else if (status) {
      preApprovals = await db
        .select()
        .from(insurancePreApprovals)
        .where(eq(insurancePreApprovals.status, status))
        .orderBy(desc(insurancePreApprovals.request_date));
    } else {
      preApprovals = await db
        .select()
        .from(insurancePreApprovals)
        .orderBy(desc(insurancePreApprovals.request_date));
    }

    return NextResponse.json({ preApprovals });
  } catch (error) {
    console.error("[Insurance Pre-Approvals API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pre-approvals" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      preapprovalid,
      status,
      authorization_number,
      authorized_amount,
      expiration_date,
      conditions,
      denial_reason,
      appeal_deadline,
    } = body;

    if (!preapprovalid) {
      return NextResponse.json(
        { error: "Pre-approval ID is required" },
        { status: 400 }
      );
    }

    const [updatedPreApproval] = await db
      .update(insurancePreApprovals)
      .set({
        status,
        authorization_number,
        authorized_amount,
        expiration_date,
        conditions,
        denial_reason,
        appeal_deadline,
        response_date: new Date(),
        updatedat: new Date(),
      })
      .where(eq(insurancePreApprovals.preapprovalid, preapprovalid))
      .returning();

    if (!updatedPreApproval) {
      return NextResponse.json(
        { error: "Pre-approval not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      preApproval: updatedPreApproval,
      message: "Pre-approval updated successfully",
    });
  } catch (error) {
    console.error("[Insurance Pre-Approvals API] Error:", error);
    return NextResponse.json(
      { error: "Failed to update pre-approval" },
      { status: 500 }
    );
  }
}
