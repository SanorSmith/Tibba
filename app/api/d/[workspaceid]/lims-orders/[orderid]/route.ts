/**
 * LIMS Order API Route
 * Fetches a specific order with its tests
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { limsOrders, limsOrderTests, labTestCatalog } from "@/lib/db/schema";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; orderid: string }> }
) {
  try {
    const { workspaceid, orderid } = await params;
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

    // Fetch the order
    const orders = await db
      .select()
      .from(limsOrders)
      .where(
        and(
          eq(limsOrders.workspaceid, workspaceid),
          eq(limsOrders.orderid, orderid)
        )
      );

    if (!orders || orders.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orders[0];

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch the tests for this order with test catalog details
    const orderTests = await db
      .select({
        ordertestid: limsOrderTests.ordertestid,
        orderid: limsOrderTests.orderid,
        testid: limsOrderTests.testid,
        teststatus: limsOrderTests.teststatus,
        testcode: labTestCatalog.testcode,
        testname: labTestCatalog.testname,
        testcategory: labTestCatalog.testcategory,
        specimentype: labTestCatalog.specimentype,
        testdescription: labTestCatalog.testdescription,
      })
      .from(limsOrderTests)
      .leftJoin(labTestCatalog, eq(limsOrderTests.testid, labTestCatalog.testid))
      .where(eq(limsOrderTests.orderid, orderid));

    return NextResponse.json({ 
      order: Object.assign({}, order, { tests: orderTests || [] })
    });
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
