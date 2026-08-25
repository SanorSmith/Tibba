import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pharmacyOrders } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
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

    // Get counts for each status
    const result = await db
      .select({
        status: pharmacyOrders.status,
        count: sql<number>`count(*)::int`,
      })
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.workspaceid, workspaceid))
      .groupBy(pharmacyOrders.status);

    // Calculate totals
    const counts = {
      all: 0,
      PENDING: 0,
      IN_PROGRESS: 0,
      DISPENSED: 0,
      CANCELLED: 0,
      PARTIALLY_DISPENSED: 0,
      ON_HOLD: 0,
    };

    result.forEach((row) => {
      counts.all += row.count;
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = row.count;
      }
    });

    return NextResponse.json({ counts });
    });
  } catch (error: any) {
    console.error("[Pharmacy Orders Counts] Error:", error);
    console.error("[Pharmacy Orders Counts] Error message:", error?.message);
    console.error("[Pharmacy Orders Counts] Error stack:", error?.stack);
    return NextResponse.json(
      { 
        error: "Failed to fetch order counts",
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
