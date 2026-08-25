/**
 * Batch OpenEHR Order Status API
 * 
 * POST endpoint to retrieve computed statuses for multiple OpenEHR orders
 * in a single request instead of N individual calls.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getOpenEHROrderStatuses } from "@/lib/openehr-order-status";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
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
    return await withTenant(workspaceid, async () => {

    const body = await request.json();
    const requestIds: string[] = body.requestIds || [];

    if (requestIds.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    const statusMap = await getOpenEHROrderStatuses(requestIds);

    // Convert Map to plain object for JSON
    const statuses: Record<string, string> = {};
    statusMap.forEach((status, id) => {
      statuses[id] = status;
    });

    return NextResponse.json({ statuses });
    });
  } catch (error) {
    console.error("Error fetching batch OpenEHR order statuses:", error);
    return NextResponse.json(
      { error: "Failed to fetch order statuses" },
      { status: 500 }
    );
  }
}
