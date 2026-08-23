/**
 * Worklist Samples API Route
 * Fetches samples associated with a specific worklist
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { worklistItems, accessionSamples } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; worklistid: string }> }
) {
  try {
    const { workspaceid, worklistid } = await params;
    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    // Fetch worklist items for this worklist
    const items = await db
      .select()
      .from(worklistItems)
      .where(eq(worklistItems.worklistid, worklistid));

    // Fetch the actual samples for these worklist items
    const sampleIds = items.map(item => item.sampleid).filter(Boolean);
    
    if (sampleIds.length === 0) {
      return NextResponse.json({ samples: [] });
    }

    const samples = await db
      .select()
      .from(accessionSamples)
      .where(
        and(
          eq(accessionSamples.workspaceid, workspaceid),
          // Use IN clause to get all samples
        )
      );

    // Filter samples by the sampleIds from worklist items
    const filteredSamples = samples.filter(sample => 
      sampleIds.includes(sample.sampleid)
    );

    return NextResponse.json({ samples: filteredSamples });
    });
  } catch (error) {
    console.error("Error fetching worklist samples:", error);
    return NextResponse.json(
      { error: "Failed to fetch worklist samples" },
      { status: 500 }
    );
  }
}
