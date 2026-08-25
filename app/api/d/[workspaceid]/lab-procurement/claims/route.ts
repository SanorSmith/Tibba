/**
 * Damage claims against a supplier.
 *
 * A claim is the commercial conversation about goods that arrived unusable:
 * what was asked for, and what was eventually settled. It never touches
 * stock — the damaged units were already excluded when the delivery was
 * received — and it is kept apart from lab_claim_damage so negotiating a
 * settlement cannot rewrite the physical record of what actually arrived.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labClaims, labGoodsReceipt } from "@/lib/db/tables/lab-procurement";
import { eq, and, desc } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Being signed in is not the same as belonging here: without this, one
    // lab's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const status = request.nextUrl.searchParams.get("status");
    const rows = await db
      .select({
        id: labClaims.id,
        claimnumber: labClaims.claimnumber,
        vendorname: labClaims.vendorname,
        status: labClaims.status,
        claimamount: labClaims.claimamount,
        settledamount: labClaims.settledamount,
        reason: labClaims.reason,
        resolution: labClaims.resolution,
        raisedbyname: labClaims.raisedbyname,
        createdat: labClaims.createdat,
        receiptnumber: labGoodsReceipt.receiptnumber,
      })
      .from(labClaims)
      .leftJoin(labGoodsReceipt, eq(labClaims.receiptid, labGoodsReceipt.id))
      .where(eq(labClaims.workspaceid, workspaceid))
      .orderBy(desc(labClaims.createdat));

    return NextResponse.json({ claims: status ? rows.filter((r) => r.status === status) : rows });
    });
  } catch (error) {
    console.error("[lab claims GET]", error);
    return NextResponse.json({ error: "Failed to load claims" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Being signed in is not the same as belonging here: without this, one
    // lab's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const { receiptId, vendorId, vendorName, claimAmount, reason } = await request.json();
    if (!(Number(claimAmount) > 0)) {
      return NextResponse.json({ error: "Claim amount must be above zero" }, { status: 400 });
    }

    const [claim] = await db
      .insert(labClaims)
      .values({
        workspaceid,
        claimnumber: `LCLM-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-4)}`,
        vendorid: vendorId || null,
        vendorname: vendorName || null,
        receiptid: receiptId || null,
        status: "OPEN",
        claimamount: String(Number(claimAmount).toFixed(2)),
        reason: reason || null,
        raisedby: user.userid,
        raisedbyname: user.name ?? user.email ?? null,
      })
      .returning();

    return NextResponse.json({ claim });
    });
  } catch (error) {
    console.error("[lab claims POST]", error);
    return NextResponse.json({ error: "Failed to raise claim" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Being signed in is not the same as belonging here: without this, one
    // lab's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const { id, status, settledAmount, resolution } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: "id and status are required" }, { status: 400 });
    }
    // Settling means money changed hands, so the amount has to be stated.
    if (status === "SETTLED" && settledAmount == null) {
      return NextResponse.json({ error: "A settled claim needs a settled amount" }, { status: 400 });
    }

    const [updated] = await db
      .update(labClaims)
      .set({
        status,
        settledamount: settledAmount != null ? String(Number(settledAmount).toFixed(2)) : undefined,
        resolution: resolution ?? undefined,
        updatedat: new Date(),
      })
      .where(and(eq(labClaims.id, id), eq(labClaims.workspaceid, workspaceid)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    return NextResponse.json({ claim: updated });
    });
  } catch (error) {
    console.error("[lab claims PATCH]", error);
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}
