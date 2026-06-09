/**
 * Fix Payment Status for Dispensed Orders
 * 
 * Updates invoice status to PAID for all dispensed orders
 * This is a one-time fix for orders that were dispensed before the payment status fix
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { pharmacyOrders } from "@/lib/db/schema";
import { invoices } from "@/lib/db/tables/pharmacy-invoices";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all dispensed orders
    const dispensedOrders = await db
      .select({ orderid: pharmacyOrders.orderid })
      .from(pharmacyOrders)
      .where(eq(pharmacyOrders.status, "DISPENSED"));

    const orderIds = dispensedOrders.map(o => o.orderid);

    if (orderIds.length === 0) {
      return NextResponse.json({
        message: "No dispensed orders found",
        updated: 0
      });
    }

    // Update all invoices for dispensed orders to PAID
    const result = await db
      .update(invoices)
      .set({
        status: "PAID",
        updatedat: new Date(),
      })
      .where(
        and(
          inArray(invoices.orderid, orderIds),
          eq(invoices.status, "ISSUED")
        )
      )
      .returning();

    console.log(`[Fix Payment Status] Updated ${result.length} invoices to PAID`);

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${result.length} invoices to PAID status`,
      updated: result.length,
      invoices: result.map(inv => ({
        invoiceNumber: inv.invoicenumber,
        orderid: inv.orderid,
        status: inv.status,
      }))
    });

  } catch (error) {
    console.error("[Fix Payment Status] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to fix payment status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
