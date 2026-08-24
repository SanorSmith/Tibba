/**
 * API Route: Drug Interaction Logs
 * Log interaction checks and retrieve interaction history
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugInteractionLogs } from "@/lib/db/tables/drug-interaction-logs";
import { desc, eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

// Log an interaction check
export async function POST(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspaceid,
      patientid,
      orderid,
      drugs,
      interactions,
      pharmacistId,
      pharmacistName,
      decision,
      justification,
      acknowledgedRisk,
    } = body;

    if (!workspaceid || !drugs || !pharmacistId || !pharmacistName || !decision) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const highestSeverity = interactions.length > 0
      ? interactions.reduce((max: string, curr: any) => {
          const severityOrder: Record<string, number> = {
            critical: 0,
            major: 1,
            moderate: 2,
            minor: 3,
          };
          return severityOrder[curr.severity] < severityOrder[max]
            ? curr.severity
            : max;
        }, interactions[0].severity)
      : null;

    const log = await db.insert(drugInteractionLogs).values({
      workspaceid,
      patientid: patientid || null,
      orderid: orderid || null,
      drugs,
      interactions,
      interactionCount: interactions.length.toString(),
      highestSeverity,
      pharmacistId,
      pharmacistName,
      decision,
      justification: justification || null,
      acknowledgedRisk: acknowledgedRisk || false,
      dispensedAt: decision === "proceeded" ? new Date() : null,
    }).returning();

    return NextResponse.json({
      success: true,
      log: log[0],
    });
  } catch (error) {
    console.error("Error logging interaction:", error);
    return NextResponse.json(
      { error: "Failed to log interaction" },
      { status: 500 }
    );
  }
}

// Get interaction logs
export async function GET(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    // The id arrives from the caller, so belonging has to be checked
    // before it is trusted as the tenant.
    if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return withTenant(workspaceid, async () => {
    const patientid = searchParams.get("patientid");
    const orderid = searchParams.get("orderid");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!workspaceid) {
      return NextResponse.json(
        { error: "workspaceid is required" },
        { status: 400 }
      );
    }

    let query = db
      .select()
      .from(drugInteractionLogs)
      .where(eq(drugInteractionLogs.workspaceid, workspaceid))
      .orderBy(desc(drugInteractionLogs.checkedAt))
      .limit(limit);

    // Filter by patient if provided
    if (patientid) {
      query = db
        .select()
        .from(drugInteractionLogs)
        .where(
          and(
            eq(drugInteractionLogs.workspaceid, workspaceid),
            eq(drugInteractionLogs.patientid, patientid)
          )
        )
        .orderBy(desc(drugInteractionLogs.checkedAt))
        .limit(limit);
    }

    // Filter by order if provided
    if (orderid) {
      query = db
        .select()
        .from(drugInteractionLogs)
        .where(
          and(
            eq(drugInteractionLogs.workspaceid, workspaceid),
            eq(drugInteractionLogs.orderid, orderid)
          )
        )
        .orderBy(desc(drugInteractionLogs.checkedAt))
        .limit(limit);
    }

    const logs = await query;

    return NextResponse.json({
      logs,
      count: logs.length,
    });
    });
  } catch (error) {
    console.error("Error fetching interaction logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
