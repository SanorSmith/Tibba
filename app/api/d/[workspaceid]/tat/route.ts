/**
 * Turnaround Time (TAT) API
 *
 * GET /api/d/[workspaceid]/tat
 *   ?from=ISO&to=ISO   — optional date range (defaults to last 7 days)
 *   ?sampleid=UUID      — single-sample detail
 *
 * Returns per-sample TAT breakdown + aggregate stats.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import {
  getWorkspaceTATSummary,
  calculateSampleTAT,
  DEFAULT_TAT_THRESHOLDS,
} from "@/lib/lims/tat-service";

export async function GET(
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

    const { searchParams } = new URL(request.url);
    const sampleid = searchParams.get("sampleid");

    // ── Single sample detail ──
    if (sampleid) {
      const tat = await calculateSampleTAT(sampleid);
      if (!tat) {
        return NextResponse.json({ error: "Sample not found" }, { status: 404 });
      }
      return NextResponse.json({ tat, thresholds: DEFAULT_TAT_THRESHOLDS });
    }

    // ── Workspace summary ──
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");

    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { stats, samples } = await getWorkspaceTATSummary(workspaceid, from, to);

    return NextResponse.json({
      stats,
      samples,
      thresholds: DEFAULT_TAT_THRESHOLDS,
      dateRange: { from: from.toISOString(), to: to.toISOString() },
    });
    });
  } catch (error) {
    console.error("[TAT API] Error:", error);
    return NextResponse.json({ error: "Failed to fetch TAT data" }, { status: 500 });
  }
}
