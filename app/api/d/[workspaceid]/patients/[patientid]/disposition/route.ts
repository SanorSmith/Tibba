import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { ensurePatientEHR } from "@/lib/openehr/ensure-ehr";
import { createDispositionComposition, getLatestDisposition, DispositionData } from "@/lib/openehr/disposition";

/**
 * POST /api/d/[workspaceid]/patients/[patientid]/disposition
 * Create a patient disposition (admit/transfer/discharge) in openEHR
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;

    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace access
    const memberships = await getUserWorkspaces(user.userid);
    const membership = memberships.find((m) => m.workspace.workspaceid === workspaceid);
    if (!membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Parse request body
    const dispositionData: DispositionData = await request.json();

    // Validate required fields
    if (!dispositionData.type || !["admit", "transfer", "discharge"].includes(dispositionData.type)) {
      return NextResponse.json(
        { error: "Invalid disposition type. Must be 'admit', 'transfer', or 'discharge'" },
        { status: 400 }
      );
    }

    // Type-specific validation
    if (dispositionData.type === "admit") {
      if (!dispositionData.ward || !dispositionData.bedNumber) {
        return NextResponse.json(
          { error: "Ward and bed number are required for admission" },
          { status: 400 }
        );
      }
    } else if (dispositionData.type === "transfer") {
      if (!dispositionData.transferTo) {
        return NextResponse.json(
          { error: "Transfer destination is required" },
          { status: 400 }
        );
      }
    } else if (dispositionData.type === "discharge") {
      if (!dispositionData.dischargeSummary) {
        return NextResponse.json(
          { error: "Discharge summary is required" },
          { status: 400 }
        );
      }
    }

    // Ensure EHR exists for patient
    const ehrId = await ensurePatientEHR(patientid);

    // Add composer information
    dispositionData.composerName = user.name || user.email;
    dispositionData.composerId = user.userid;

    // Create disposition composition in openEHR
    const result = await createDispositionComposition(
      ehrId,
      dispositionData,
      membership.workspace.name || "Emergency Department"
    );

    return NextResponse.json({
      success: true,
      compositionUid: result.compositionUid,
      disposition: dispositionData,
      message: `Patient disposition set to ${dispositionData.type.toUpperCase()}`,
    });
  } catch (error) {
    console.error("Error creating disposition:", error);
    return NextResponse.json(
      { error: "Failed to create disposition", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/d/[workspaceid]/patients/[patientid]/disposition
 * Retrieve the latest patient disposition from openEHR
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; patientid: string }> }
) {
  try {
    const { workspaceid, patientid } = await params;

    // Authenticate user
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify workspace access
    const memberships = await getUserWorkspaces(user.userid);
    const membership = memberships.find((m) => m.workspace.workspaceid === workspaceid);
    if (!membership) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Ensure EHR exists for patient
    const ehrId = await ensurePatientEHR(patientid);

    // Get latest disposition from openEHR
    const disposition = await getLatestDisposition(ehrId);

    if (!disposition) {
      return NextResponse.json({
        success: true,
        disposition: null,
        message: "No disposition found for this patient",
      });
    }

    return NextResponse.json({
      success: true,
      disposition,
    });
  } catch (error) {
    console.error("Error fetching disposition:", error);
    return NextResponse.json(
      { error: "Failed to fetch disposition", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
