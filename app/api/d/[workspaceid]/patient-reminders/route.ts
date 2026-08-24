import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientReminders } from "@/lib/db/schema";
import { eq, and, desc, lte, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

// GET — list reminders for workspace (only due: reminderdate <= tomorrow)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get("all") === "true";

    // Tomorrow end of day
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const conditions = [eq(patientReminders.workspaceid, workspaceid)];

    if (!showAll) {
      conditions.push(lte(patientReminders.reminderdate, tomorrow));
    }

    const rows = await db
      .select()
      .from(patientReminders)
      .where(and(...conditions))
      .orderBy(desc(patientReminders.reminderdate));

    return NextResponse.json({ reminders: rows });
    });
  } catch (err) {
    console.error("[patient-reminders GET]", err);
    return NextResponse.json({ error: "Failed to fetch reminders" }, { status: 500 });
  }
}

// POST — create a new reminder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return withTenant(workspaceid, async () => {

    const body = await request.json();
    const { title, description, patientid, patientname, reminderdate, priority, orderid } = body;

    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const [row] = await db
      .insert(patientReminders)
      .values({
        workspaceid,
        title,
        description: description || null,
        patientid: patientid || null,
        patientname: patientname || null,
        reminderdate: reminderdate ? new Date(reminderdate) : null,
        priority: priority || "medium",
        orderid: orderid || null,
        createdby: user.name || user.email || null,
        completed: false,
      })
      .returning();

    return NextResponse.json({ reminder: row });
    });
  } catch (err) {
    console.error("[patient-reminders POST]", err);
    return NextResponse.json({ error: "Failed to create reminder" }, { status: 500 });
  }
}
