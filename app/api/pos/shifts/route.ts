/**
 * POS Shift Management API
 *
 * POST — open a new shift
 * GET  — get current open shift for the logged-in cashier
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { posShifts } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { z } from "zod";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

const openShiftSchema = z.object({
  workspaceId: z.string().uuid(),
  openingCash: z.number().nonnegative(),
  notes: z.string().optional(),
});

// POST — open shift
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = openShiftSchema.parse(body);

    // The schema proves the id is a uuid, not that the caller belongs
    // to it — that is a separate question, and this is where it is asked.
    if (!(await isWorkspaceMember(user.userid, data.workspaceId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(data.workspaceId, async () => {

    // Check if cashier already has an open shift
    const [existingShift] = await db
      .select()
      .from(posShifts)
      .where(
        and(
          eq(posShifts.cashierid, user.userid),
          eq(posShifts.status, "OPEN")
        )
      )
      .limit(1);

    if (existingShift) {
      return NextResponse.json(
        {
          error: "You already have an open shift",
          shift: existingShift,
        },
        { status: 400 }
      );
    }

    // Generate shift number
    const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const seq = Date.now().toString(36).toUpperCase();
    const shiftNumber = `SHIFT-${today}-${seq}`;

    // Create shift
    const [shift] = await db
      .insert(posShifts)
      .values({
        workspaceid: data.workspaceId,
        cashierid: user.userid,
        shiftnumber: shiftNumber,
        openingtime: new Date(),
        openingcash: data.openingCash.toFixed(2),
        status: "OPEN",
        notes: data.notes || null,
      })
      .returning();

    console.log(
      `[POS] Shift ${shiftNumber} opened by ${user.name || user.email}`
    );

    return NextResponse.json({ shift }, { status: 201 });
    });
  } catch (error) {
    console.error("[POS Open Shift]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to open shift" },
      { status: 500 }
    );
  }
}

// GET — get current open shift
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // A cashier can hold an open shift at more than one facility, so which
    // one is being asked about has to be said. It was not filtered before,
    // and under row-level security the query returns nothing without a
    // tenant — the till would report no open shift.
    const workspaceid = request.nextUrl.searchParams.get("workspaceid");
    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    }
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {
    const [shift] = await db
      .select()
      .from(posShifts)
      .where(
        and(
          eq(posShifts.cashierid, user.userid),
          eq(posShifts.status, "OPEN")
        )
      )
      .limit(1);

    return NextResponse.json({ shift: shift || null });
    });
  } catch (error) {
    console.error("[POS Get Shift]", error);
    return NextResponse.json(
      { error: "Failed to get shift" },
      { status: 500 }
    );
  }
}
