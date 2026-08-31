/**
 * Which facility may see and act on a pharmacy order.
 *
 * Since a prescription became routable an order names two facilities:
 * `workspaceid` is where it was prescribed and `dispensingworkspaceid` where
 * it is to be filled. The row-level policy on `pharmacy_orders` already admits
 * either, but the application's own filters asked about the prescriber alone —
 * so an order sent to another pharmacy was stored correctly, allowed by the
 * database, and then shown to nobody. These two helpers are the one place that
 * question is answered, so the queue, the counts, the detail view and
 * dispensing cannot drift apart on it again.
 *
 * Orders written before the column existed carry a NULL destination; the
 * prescriber check still covers those.
 */
import { eq, or, type SQL } from "drizzle-orm";
import { pharmacyOrders } from "@/lib/db/schema";

/** WHERE fragment: orders this facility either wrote or is to dispense. */
export function ordersForFacility(workspaceId: string): SQL {
  return or(
    eq(pharmacyOrders.workspaceid, workspaceId),
    eq(pharmacyOrders.dispensingworkspaceid, workspaceId),
  )!;
}

/** The same question asked of a row already fetched. */
export function facilityHandlesOrder(
  order: { workspaceid: string; dispensingworkspaceid?: string | null },
  workspaceId: string,
): boolean {
  return (
    order.workspaceid === workspaceId ||
    order.dispensingworkspaceid === workspaceId
  );
}
