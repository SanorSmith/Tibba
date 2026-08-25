import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { OpenEHRResultSubmissionService } from "@/lib/lims/openehr-result-submission";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { ownerWorkspaceOf } from "@/lib/db/owner-workspace";

/**
 * POST /api/lims/samples/[sampleid]/submit-results
 * 
 * Manually submit test results to OpenEHR for a specific sample
 * Generates FHIR DiagnosticReport and submits to patient's EHR
 */
export async function POST(
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
    const body = await request.json();
    const { overrideStatus } = body;

    // Validate override status if provided
    const validStatuses = ["preliminary", "final", "corrected"];
    if (overrideStatus && !validStatuses.includes(overrideStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Must be preliminary, final, or corrected" },
        { status: 400 }
      );
    }

    // Submit results to OpenEHR
    const result = await OpenEHRResultSubmissionService.submitResultsToOpenEHR({
      sampleid,
      userid: user.userid,
      overrideStatus: overrideStatus || "final",
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to submit results to OpenEHR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      compositionUid: result.compositionUid,
      message: "Results successfully submitted to OpenEHR",
    });
    });
  } catch (error) {
    console.error("Error submitting results to OpenEHR:", error);
    return NextResponse.json(
      { error: "Failed to submit results to OpenEHR" },
      { status: 500 }
    );
  }
}
