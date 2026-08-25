import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validationStates } from "@/lib/db/schema";
import { createWorkspaceNotification } from "@/lib/notifications";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;

    // This route had no authentication at all: the facility's data was
    // served to anyone who could type the URL. Who you are, whether you
    // belong here, and only then the data.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {
    const body = await request.json();
    const { sampleid, state } = body;

    if (!sampleid || !state) {
      return NextResponse.json(
        { error: "Missing required fields: sampleid and state" },
        { status: 400 }
      );
    }

    // Valid states
    const validStates = [
      'RECEIVED',
      'ANALYZED',
      'TECH_VALIDATED',
      'CLINICALLY_VALIDATED',
      'RELEASED',
      'REJECTED',
      'RERUN_REQUESTED'
    ];

    if (!validStates.includes(state)) {
      return NextResponse.json(
        { error: `Invalid state. Must be one of: ${validStates.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if validation state exists for this sample
    const existingState = await db
      .select()
      .from(validationStates)
      .where(eq(validationStates.sampleid, sampleid))
      .limit(1);

    let result;

    if (existingState.length > 0) {
      // Update existing state
      result = await db
        .update(validationStates)
        .set({
          currentstate: state,
          validateddate: state === 'RELEASED' || state === 'CLINICALLY_VALIDATED' ? new Date() : null,
          updatedat: new Date(),
        })
        .where(eq(validationStates.sampleid, sampleid))
        .returning();
    } else {
      // Create new validation state
      result = await db
        .insert(validationStates)
        .values({
          sampleid,
          currentstate: state,
          validateddate: state === 'RELEASED' || state === 'CLINICALLY_VALIDATED' ? new Date() : null,
        })
        .returning();
    }

    // Create notification for test validation (only for validation states)
    if (['TECH_VALIDATED', 'CLINICALLY_VALIDATED', 'RELEASED'].includes(state)) {
      try {
        await createWorkspaceNotification({
          workspaceid,
          type: "TEST_VALIDATED",
          title: `Test ${state.replace('_', ' ').toUpperCase()}`,
          message: `Sample ${sampleid} has been ${state.replace('_', ' ').toLowerCase()}.`,
          relatedentityid: sampleid,
          relatedentitytype: "sample",
          metadata: {
            sampleId: sampleid,
            validationState: state,
            validatedDate: state === 'RELEASED' || state === 'CLINICALLY_VALIDATED' ? new Date() : null,
          },
          priority: state === 'RELEASED' ? "high" : "medium",
        });
      } catch (notificationError) {
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      validationState: result[0],
      message: `Sample ${state.toLowerCase().replace('_', ' ')} successfully`,
    });
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update validation state", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
