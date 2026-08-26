/**
 * OpenEHR Order Status API
 * 
 * GET endpoint to retrieve the computed status of an OpenEHR order
 * based on its samples' validation states
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getOpenEHROrderStatus } from "@/lib/openehr-order-status";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant, withoutTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; requestid: string }> }
) {
  try {
    const { workspaceid, requestid } = await params;
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
    return await withoutTenant("reads openEHR and shared patient data only — no facility-scoped table, so no transaction is held across the HTTP call", async () => {

    // Get the computed status for this OpenEHR order
    const status = await getOpenEHROrderStatus(requestid);

    return NextResponse.json({ 
      openehrrequestid: requestid,
      status,
      source: "computed"
    });
    });
  } catch (error) {
    console.error("Error fetching OpenEHR order status:", error);
    return NextResponse.json(
      { error: "Failed to fetch order status" },
      { status: 500 }
    );
  }
}
