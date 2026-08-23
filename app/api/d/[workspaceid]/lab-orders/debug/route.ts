import { NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { queryOpenEHR } from "@/lib/openehr/openehr";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: Request,
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
    return withTenant(workspaceid, async () => {

    // Query to find all test orders with their EHR IDs
    const query = `SELECT
      e/ehr_id/value as ehr_id,
      c/uid/value as composition_uid,
      c/context/start_time/value as recorded_time
    FROM
      EHR e
      CONTAINS COMPOSITION c[openEHR-EHR-COMPOSITION.encounter.v1]
      CONTAINS INSTRUCTION i[openEHR-EHR-INSTRUCTION.service_request.v1]
    ORDER BY
      c/context/start_time/value DESC
    LIMIT 50`;

    const results = await queryOpenEHR<{
      ehr_id: string;
      composition_uid: string;
      recorded_time: string;
    }>(query);

    return NextResponse.json({ 
      message: "Recent test orders across all EHRs",
      count: results.length,
      orders: results 
    });
    });
  } catch (error) {
    console.error("Error querying test orders:", error);
    return NextResponse.json(
      { error: "Failed to query test orders" },
      { status: 500 }
    );
  }
}
