/**
 * Sync Pharmacy Orders from OpenEHR
 *
 * POST /api/d/[workspaceid]/pharmacy-orders/sync
 *
 * Fetches all medication order compositions from openEHR for every patient
 * in this workspace, then upserts them into the local pharmacy_orders and
 * pharmacy_order_items tables (deduplicated by composition_uid).
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, pharmacyOrders, pharmacyOrderItems, users } from "@/lib/db/schema";
import { eq, ilike, or, isNull } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getOpenEHREHRBySubjectId, getOpenEHRPrescriptions } from "@/lib/openehr/openehr";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";
import { pool } from "@/lib/db/pool";

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
    // This ran the whole sync in one transaction, including an EHRbase call
    // per patient. The connection was held for the entire walk. It now reads
    // what it needs, walks EHRbase with nothing open, and writes at the end.

    // 1. Get patients in this workspace AND global patients (workspaceid IS NULL).
    //    `patients` is shared-read (0068), so no tenant is needed for it.
    const workspacePatients = await db
      .select()
      .from(patients)
      ;   // Shared-read since 0068; the global NULL pool is gone. RLS decides.

    // Filter to only patients with EHR IDs to avoid unnecessary API calls
    const patientsWithEHR = workspacePatients.filter(p => p.ehrid || p.nationalid);

    // 2. Existing openEHR order ids, so duplicates are skipped. Facility-scoped,
    //    so this one short read takes a tenant.
    const existingOrders = await withTenant(workspaceid, async () =>
      db
        .select({ openehrorderid: pharmacyOrders.openehrorderid })
        .from(pharmacyOrders)
        .where(eq(pharmacyOrders.workspaceid, workspaceid)));

    const existingIds = new Set(
      existingOrders
        .map((o) => o.openehrorderid)
        .filter(Boolean)
    );

    let skipped = 0;
    const errors: string[] = [];
    const pending: Array<{
      patientid: string;
      prescriberid: string | null;
      rx: Record<string, any>;
      priority: "urgent" | "routine";
      dosage: string | null;
      drugName: string;
    }> = [];

    // 3. For each patient with EHR ID, fetch prescriptions from openEHR
    for (const patient of patientsWithEHR) {
      let ehrId: string | null = null;

      try {
        if (patient.ehrid) {
          ehrId = patient.ehrid;
        } else if (patient.nationalid) {
          ehrId = await getOpenEHREHRBySubjectId(patient.nationalid);
        }
        if (!ehrId) {
          ehrId = await getOpenEHREHRBySubjectId(patient.patientid);
        }
        if (!ehrId) {
          continue;
        }

        const prescriptions = await getOpenEHRPrescriptions(ehrId);

        for (const rx of prescriptions) {
          // Deduplicate by composition_uid
          if (existingIds.has(rx.composition_uid)) {
            skipped++;
            continue;
          }

          // Determine priority from the prescription
          const priority = rx.clinical_indication?.toLowerCase().includes("urgent")
            ? "urgent" as const
            : "routine" as const;

          // Try to find prescriber by name in users table
          let prescriberid: string | null = null;
          if (rx.prescribed_by && rx.prescribed_by !== "Unknown") {
            const [prescriber] = await db
              .select({ userid: users.userid })
              .from(users)
              .where(ilike(users.name, `%${rx.prescribed_by}%`))
              .limit(1);
            
            if (prescriber) {
              prescriberid = prescriber.userid;
            }
          }

          // Build dosage string
          const dosageParts: string[] = [];
          if (rx.dose_amount) dosageParts.push(`${rx.dose_amount}${rx.dose_unit ? ` ${rx.dose_unit}` : ""}`);
          if (rx.route) dosageParts.push(rx.route);
          if (rx.timing_directions) dosageParts.push(rx.timing_directions);
          const dosage = dosageParts.join(", ") || null;

          const drugName = rx.medication_item || rx.product_name || "Unknown medication";

          // Collected, not written. The price lookup below reads items,
          // item_batches and inventory_stock — all facility-scoped — so it
          // moves into the write phase where a tenant exists.
          pending.push({
            patientid: patient.patientid,
            prescriberid,
            rx,
            priority,
            dosage,
            drugName,
          });

          existingIds.add(rx.composition_uid);
        }
      } catch (err) {
        const msg = `Patient ${patient.firstname} ${patient.lastname}: ${err instanceof Error ? err.message : String(err)}`;
        console.error("[Pharmacy Sync]", msg);
        errors.push(msg);
      }
    }

    // 4. One transaction, after EHRbase is done with. The price lookup lives
    //    here because it reads facility-scoped inventory, and each order is
    //    still written with its item so neither can exist alone.
    let synced = 0;
    if (pending.length > 0) {
      await withTenant(workspaceid, async () => {
        for (const p of pending) {
          const priceResult = await pool.query(
            `SELECT ib.selling_price
               FROM items i
               INNER JOIN item_batches ib ON ib.item_id = i.id
               INNER JOIN inventory_stock ist ON ist.batch_id = ib.id
              WHERE i.name ILIKE $1
                AND i.is_active = true
                AND ist.quantity > 0
                AND (ib.expiry_date IS NULL OR ib.expiry_date > CURRENT_DATE)
              ORDER BY ib.expiry_date ASC NULLS LAST
              LIMIT 1`,
            [p.drugName],
          );
          const sellingPrice = priceResult.rows[0]?.selling_price ?? null;

          const [order] = await db
            .insert(pharmacyOrders)
            .values({
              workspaceid,
              patientid: p.patientid,
              prescriberid: p.prescriberid,
              status: "PENDING",
              source: "openehr",
              openehrorderid: p.rx.composition_uid,
              priority: p.priority,
              notes: [
                p.rx.clinical_indication && `Indication: ${p.rx.clinical_indication}`,
                p.rx.comment,
                p.rx.prescribed_by && `Prescribed by: ${p.rx.prescribed_by}`,
              ].filter(Boolean).join(" | ") || null,
              metadata: {
                composition_uid: p.rx.composition_uid,
                recorded_time: p.rx.recorded_time,
                prescribed_by: p.rx.prescribed_by,
                issued_from: p.rx.issued_from,
              },
            })
            .returning();

          await db.insert(pharmacyOrderItems).values({
            orderid: order.orderid,
            drugid: null,
            drugname: p.drugName,
            dosage: p.dosage,
            quantity: 1,
            unitprice: sellingPrice,
            status: "PENDING",
          });
          synced++;
        }
      });
    }

    return NextResponse.json({
      message: `Synced ${synced} new orders, skipped ${skipped} existing`,
      synced,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[Pharmacy Sync POST]", error);
    return NextResponse.json({ error: "Failed to sync orders from openEHR" }, { status: 500 });
  }
}
