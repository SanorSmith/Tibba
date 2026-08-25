/**
 * Lab cashier shifts.
 *
 * GET   — shift history, plus whichever is currently open.
 * POST  — open a shift with a starting float.
 * PATCH — close it, comparing counted cash against what was taken.
 *
 * Only one shift may be open per facility at a time: two open drawers would
 * make it impossible to say which one a payment belonged to.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labShifts, labPayments } from "@/lib/db/tables/lab-pos";
import { eq, and, desc, sql } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const workspaceid = request.nextUrl.searchParams.get("workspaceid");
    if (!workspaceid) return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {


    const shifts = await db
      .select({
        id: labShifts.id,
        shiftnumber: labShifts.shiftnumber,
        cashiername: labShifts.cashiername,
        status: labShifts.status,
        openingtime: labShifts.openingtime,
        closingtime: labShifts.closingtime,
        openingcash: labShifts.openingcash,
        expectedcash: labShifts.expectedcash,
        actualcash: labShifts.actualcash,
        variance: labShifts.variance,
        variancereason: labShifts.variancereason,
        // Totals computed from payments rather than stored, so they can never
        // drift from the underlying rows.
        collected: sql<string>`COALESCE((SELECT SUM(amount) FROM lab_payments WHERE shift_id = ${labShifts.id}), 0)`,
        cashCollected: sql<string>`COALESCE((SELECT SUM(amount) FROM lab_payments WHERE shift_id = ${labShifts.id} AND method = 'CASH'), 0)`,
        transactions: sql<number>`(SELECT COUNT(*) FROM lab_payments WHERE shift_id = ${labShifts.id})::int`,
      })
      .from(labShifts)
      .where(eq(labShifts.workspaceid, workspaceid))
      .orderBy(desc(labShifts.openingtime))
      .limit(50);

    return NextResponse.json({
      shifts,
      openShift: shifts.find((s) => s.status === "OPEN") ?? null,
    });
    });
  } catch (error) {
    console.error("[lab shifts GET]", error);
    return NextResponse.json({ error: "Failed to load shifts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceid, openingCash, notes } = await request.json();
    if (!workspaceid) return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {


    const [existing] = await db
      .select({ id: labShifts.id })
      .from(labShifts)
      .where(and(eq(labShifts.workspaceid, workspaceid), eq(labShifts.status, "OPEN")))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "A shift is already open. Close it first." }, { status: 400 });
    }

    const [shift] = await db
      .insert(labShifts)
      .values({
        workspaceid,
        shiftnumber: `LSH-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`,
        cashierid: user.userid,
        cashiername: user.name ?? user.email ?? null,
        status: "OPEN",
        openingcash: String(Number(openingCash ?? 0).toFixed(2)),
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({ shift });
    });
  } catch (error) {
    console.error("[lab shifts POST]", error);
    return NextResponse.json({ error: "Could not open shift" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { workspaceid, shiftId, actualCash, varianceReason } = await request.json();
    if (!workspaceid || !shiftId) {
      return NextResponse.json({ error: "workspaceid and shiftId are required" }, { status: 400 });
    }
    // Signed in is not the same as belonging here: without this, one lab's
    // money is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {


    const result = await db.transaction(async (tx) => {
      const [shift] = await tx
        .select()
        .from(labShifts)
        .where(and(eq(labShifts.id, shiftId), eq(labShifts.workspaceid, workspaceid)))
        .limit(1);
      if (!shift) throw new Error("Shift not found");
      if (shift.status === "CLOSED") throw new Error("Shift is already closed");

      // Only cash is expected in the drawer — card and transfer settle
      // elsewhere, so counting them here would guarantee a false variance.
      const [{ cash }] = await tx
        .select({ cash: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(labPayments)
        .where(and(eq(labPayments.shiftid, shiftId), eq(labPayments.method, "CASH")));

      const expected = Number(shift.openingcash ?? 0) + Number(cash ?? 0);
      const actual = Number(actualCash ?? 0);
      const variance = actual - expected;

      const [closed] = await tx
        .update(labShifts)
        .set({
          status: "CLOSED",
          closingtime: new Date(),
          expectedcash: String(expected.toFixed(2)),
          actualcash: String(actual.toFixed(2)),
          variance: String(variance.toFixed(2)),
          variancereason: varianceReason || null,
        })
        .where(eq(labShifts.id, shiftId))
        .returning();

      return { shift: closed, expected, actual, variance };
    });

    return NextResponse.json(result);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not close shift";
    console.error("[lab shifts PATCH]", error);
    return NextResponse.json({ error: message }, { status: /not found|already/i.test(message) ? 400 : 500 });
  }
}
