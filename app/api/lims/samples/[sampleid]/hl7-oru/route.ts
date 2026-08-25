import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { OpenEHRResultSubmissionService } from "@/lib/lims/openehr-result-submission";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { ownerWorkspaceOf } from "@/lib/db/owner-workspace";

/**
 * GET /api/lims/samples/[sampleid]/hl7-oru
 * 
 * Generate HL7 ORU^R01 message for external systems
 * Returns HL7 message string for integration with external lab systems
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sampleid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sampleid } = await params;

    // Only the record id is known here, so the owning facility is
    // resolved first and membership decides whether to go on.
    const workspaceid = await ownerWorkspaceOf("accession_sample", sampleid);
    if (!workspaceid) {
      return NextResponse.json({ error: "Sample not found" }, { status: 404 });
    }
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {
    const searchParams = request.nextUrl.searchParams;

    // Optional parameters for HL7 message
    const sendingApplication = searchParams.get("sendingApplication") || undefined;
    const sendingFacility = searchParams.get("sendingFacility") || undefined;
    const receivingApplication = searchParams.get("receivingApplication") || undefined;
    const receivingFacility = searchParams.get("receivingFacility") || undefined;

    // Generate HL7 ORU message
    const result = await OpenEHRResultSubmissionService.generateHL7ORUMessage({
      sampleid,
      sendingApplication,
      sendingFacility,
      receivingApplication,
      receivingFacility,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to generate HL7 message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      messageType: "ORU^R01",
    });
    });
  } catch (error) {
    console.error("Error generating HL7 ORU message:", error);
    return NextResponse.json(
      { error: "Failed to generate HL7 message" },
      { status: 500 }
    );
  }
}
