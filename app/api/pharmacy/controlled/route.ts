// ─── /api/pharmacy/controlled/route.ts ───────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { db as db } from "@/lib/db";
import { controlledDrugLog, stores, items, itemBatches } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(req: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // The controlled-drug log is a facility record and a regulatory one, so
    // the facility has to be named and proved. Without a tenant this returned
    // an empty log, which for this table is worse than an error.
    const workspaceid = req.nextUrl.searchParams.get("workspaceid");
    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    }
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {
    const logs = await db
      .select({
        id:              controlledDrugLog.id,
        actiontype:      controlledDrugLog.actiontype,
        quantity:        controlledDrugLog.quantity,
        patientref:      controlledDrugLog.patientref,
        prescriptionref: controlledDrugLog.prescriptionref,
        dispensedby:     controlledDrugLog.dispensedby,
        witnessedby:     controlledDrugLog.witnessedby,
        notes:           controlledDrugLog.notes,
        createdat:       controlledDrugLog.createdat,
        itemname:        items.name,
        storename:       stores.name,
        batchnumber:     itemBatches.batchnumber,
      })
      .from(controlledDrugLog)
      .leftJoin(items,       eq(controlledDrugLog.itemid,  items.id))
      .leftJoin(stores,      eq(controlledDrugLog.storeid, stores.id))
      .leftJoin(itemBatches, eq(controlledDrugLog.batchid, itemBatches.id))
      .orderBy(sql`${controlledDrugLog.createdat} DESC`)
      .limit(100);
    return NextResponse.json(logs);
    });
  } catch (error) {
    console.error("Controlled log GET error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { storeid, itemid, quantity, actiontype, patientref, prescriptionref, dispensedby, witnessedby, notes, batchid } = body;

    if (!storeid || !itemid || !quantity) return NextResponse.json({ error: "storeid, itemid and quantity required" }, { status: 400 });

    // A controlled-drug entry is a regulatory record. The facility has to be
    // named and proved, and the tenant is what lets the insert past the write
    // policy rather than being refused.
    const workspaceid = body.workspaceid ?? body.workspaceId;
    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    }
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {

    const [log] = await db.insert(controlledDrugLog).values({
      storeid, itemid, quantity: Number(quantity), actiontype, patientref,
      prescriptionref, dispensedby, witnessedby, notes, batchid: batchid ?? null,
    }).returning();

    return NextResponse.json(log, { status: 201 });
    });
  } catch (error) {
    console.error("Controlled log POST error:", error);
    return NextResponse.json({ error: "Failed to save log" }, { status: 500 });
  }
}
