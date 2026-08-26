import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { db } from "@/lib/db";
import { pharmacyOrders, pharmacyOrderItems, patients, drugBatches, warehouses, inventoryStock, stockTransactions } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { UserWorkspace } from "@/lib/db/tables/workspace";
import { createMedicationDispenseComposition, MEDICATION_DISPENSE_ACTION_STATES } from "@/lib/openehr/medication-dispense";
import { createOpenEHRComposition, getOpenEHREHRBySubjectId } from "@/lib/openehr/openehr";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { recordCompositionOwner } from "@/lib/openehr/composition-ownership";

/**
 * POST /api/d/[workspaceid]/pharmacy/orders/[orderid]/dispense
 * Dispense a pharmacy order and create OpenEHR composition
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; orderid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid, orderid } = await params;
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check workspace access
    const workspaces = await getUserWorkspaces(user.userid);
    const membership = workspaces.find(
      (w: UserWorkspace) => w.workspace.workspaceid === workspaceid
    );

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only pharmacists and administrators can dispense
    if (membership.role !== "pharmacist" && membership.role !== "administrator") {
      return NextResponse.json({ error: "Forbidden - Pharmacist role required" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { items } = body; // Array of { itemid, batchid, quantity, substituted }

    // Dispensing used to run as one transaction wrapped around the whole
    // handler, including a composition created in EHRbase for every item. A
    // connection was held for the length of all of them.
    //
    // It now reads under a tenant, releases it, does every EHRbase call with
    // nothing open, and performs all the local writes in one transaction at
    // the end. The failure behaviour is deliberate and unchanged where it
    // matters: if EHRbase fails, no local change happens at all, exactly as
    // before. If a local write fails afterwards, compositions can exist in
    // EHRbase with no dispense recorded against them — visible, recoverable,
    // and the rarer of the two.

    // Fetch the pharmacy order
    const [order] = await withTenant(workspaceid, async () => db
      .select()
      .from(pharmacyOrders)
      .where(
        and(
          eq(pharmacyOrders.orderid, orderid),
          eq(pharmacyOrders.workspaceid, workspaceid)
        )
      )
      .limit(1));

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status === "DISPENSED") {
      return NextResponse.json({ error: "Order already dispensed" }, { status: 400 });
    }

    if (order.status === "CANCELLED") {
      return NextResponse.json({ error: "Cannot dispense cancelled order" }, { status: 400 });
    }

    // Fetch patient for OpenEHR
    if (!order.patientid) {
      return NextResponse.json({ error: "Order has no patient" }, { status: 400 });
    }

    const [patient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, order.patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (!patient.nationalid) {
      return NextResponse.json({ error: "Patient has no national ID" }, { status: 400 });
    }

    // Read the items before touching EHRbase — they do not depend on the EHR
    // id, and this keeps every scoped read on one side of the HTTP calls.
    const orderItems = await withTenant(workspaceid, async () => db
      .select({
        item: pharmacyOrderItems,
        batch: drugBatches,
      })
      .from(pharmacyOrderItems)
      .leftJoin(drugBatches, eq(pharmacyOrderItems.batchid, drugBatches.batchid))
      .where(eq(pharmacyOrderItems.orderid, orderid)));

    if (orderItems.length === 0) {
      return NextResponse.json({ error: "No items in order" }, { status: 400 });
    }

    // Get patient's EHR ID
    const ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
    if (!ehrId) {
      return NextResponse.json({ error: "Patient EHR not found" }, { status: 404 });
    }

    // Every composition is created first, with no transaction open. If any of
    // this fails the request stops here and nothing has been written locally.
    const compositionByItem = new Map<string, string>();

    for (const { item, batch } of orderItems) {
      const dispenseData = items?.find((i: { itemid: string }) => i.itemid === item.itemid);
      if (!dispenseData) continue; // Skip items not being dispensed

      const compositionData = createMedicationDispenseComposition({
        medicationItem: item.drugname,
        quantityDispensed: dispenseData.quantity || item.quantity,
        quantityUnit: "units", // TODO: Get from drug catalog
        batchNumber: batch?.lotnumber || "UNKNOWN",
        expiryDate: batch?.expirydate || new Date().toISOString().split('T')[0],
        route: "oral", // TODO: Get from prescription
        substitutionPerformed: dispenseData.substituted ? "SUBSTITUTION_PERFORMED" : "SUBSTITUTION_NOT_PERFORMED",
        substitutionReason: dispenseData.substitutionReason || "",
        actionState: "PRESCRIPTION_DISPENSED",
        comment: dispenseData.notes || "",
        timing: new Date().toISOString(),
        composerName: user.name || "Pharmacist",
      });

      compositionByItem.set(
        item.itemid,
        await createOpenEHRComposition(
          ehrId,
          "template_medication_dispense_v1",
          compositionData as Record<string, unknown>
        ),
      );
    }

    const dispenseCompositionUids = [...compositionByItem.values()];

    // Now the local writes, all of them, in one transaction.
    await withTenant(workspaceid, async () => {
    for (const { item } of orderItems) {
      const dispenseData = items?.find((i: { itemid: string }) => i.itemid === item.itemid);
      if (!dispenseData) continue;
      const compositionUid = compositionByItem.get(item.itemid);
      if (!compositionUid) continue;

      // Record the owning facility where it can be enforced. Without this
      // the only trace of who a composition belongs to is prose inside
      // the document, which a wording change would silently break.
      // Writes a facility-scoped row, so it belongs here rather than in the
      // pre-pass above.
      await recordCompositionOwner({
        compositionUid: compositionUid,
        workspaceId: workspaceid,
        patientId: null,
      });

      // Update order item status
      await db
        .update(pharmacyOrderItems)
        .set({
          status: dispenseData.substituted ? "SUBSTITUTED" : "DISPENSED",
          batchid: dispenseData.batchid || item.batchid,
          scannedbarcode: dispenseData.barcode,
          scannedat: new Date(),
          notes: dispenseData.notes,
        })
        .where(eq(pharmacyOrderItems.itemid, item.itemid));

      // Deduct inventory stock
      const dispenseQuantity = dispenseData.quantity || item.quantity;
      if (dispenseQuantity > 0) {
        // Find pharmacy warehouse
        const pharmacyWarehouse = await db
          .select({ id: warehouses.id })
          .from(warehouses)
          .where(eq(warehouses.warehousetype, 'pharmacy'))
          .limit(1);

        if (pharmacyWarehouse.length > 0) {
          // Find inventory stock record for this item
          if (item.drugid) {
            const stockRecord = await db
              .select()
              .from(inventoryStock)
              .where(
                and(
                  eq(inventoryStock.itemid, item.drugid),
                  eq(inventoryStock.warehouseid, pharmacyWarehouse[0].id),
                  dispenseData.batchid ? eq(inventoryStock.batchid, dispenseData.batchid) : isNotNull(inventoryStock.batchid)
                )
              )
              .limit(1);

            if (stockRecord.length > 0) {
              const newQuantity = Math.max(0, stockRecord[0].quantity - dispenseQuantity);
              await db
                .update(inventoryStock)
                .set({ 
                  quantity: newQuantity,
                  lastupdated: new Date()
                })
                .where(eq(inventoryStock.id, stockRecord[0].id));

              // Create stock transaction record
              await db
                .insert(stockTransactions)
                .values({
                  workspaceid: workspaceid,
                  itemid: item.drugid,
                  warehouseid: pharmacyWarehouse[0].id,
                  batchid: dispenseData.batchid || item.batchid,
                  transactiontype: 'DISPENSE',
                  quantity: -dispenseQuantity,
                  referenceid: orderid,
                  referencetype: 'PHARMACY_ORDER',
                  createdat: new Date(),
                  createdby: user.userid,
                });
            }
          }
        }
      }
    }

    // Update pharmacy order — still inside the write transaction, so the
    // order is only marked dispensed if every item's write succeeded.
    await db
      .update(pharmacyOrders)
      .set({
        status: "DISPENSED",
        dispensedby: user.userid,
        dispensedat: new Date(),
        dispensecompositionuid: dispenseCompositionUids.join(","), // Store all composition UIDs
        updatedat: new Date(),
      })
      .where(eq(pharmacyOrders.orderid, orderid));
    });

    return NextResponse.json({
      success: true,
      orderid,
      dispenseCompositionUids,
      message: "Order dispensed successfully and recorded in OpenEHR",
    });
  } catch (error) {
    console.error("Error dispensing order:", error);
    return NextResponse.json(
      { error: "Failed to dispense order", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
