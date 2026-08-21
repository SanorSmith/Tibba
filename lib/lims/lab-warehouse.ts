/**
 * Every lab keeps its stock in its own warehouse, scoped by workspace — that
 * is what stops one lab seeing another's reagents, since stock is keyed on
 * (item, warehouse, batch).
 *
 * Nothing created that warehouse. Workspace creation writes a workspaces row
 * and stops there, so a newly created lab reached Inventory, Procurement, and
 * the manual pull with nowhere to put anything, and every one of those routes
 * refused with "this lab has no warehouse configured yet". The pharmacy only
 * looked like it worked because its warehouse row happened to be seeded by
 * hand.
 *
 * So the warehouse is created on first use instead of at sign-up: it covers
 * labs made before this existed as well as new ones, and it does not depend on
 * a workspace being created through any particular code path.
 */
import { db } from "@/lib/db";
import { warehouses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

type Db = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function ensureLabWarehouse(
  workspaceid: string,
  labName?: string | null,
  tx: Db = db
): Promise<{ id: string; name: string }> {
  const [existing] = await tx
    .select({ id: warehouses.id, name: warehouses.name })
    .from(warehouses)
    .where(and(eq(warehouses.workspaceid, workspaceid), eq(warehouses.warehousetype, "lab")))
    .limit(1);
  if (existing) return existing;

  const name = labName ? `${labName} Store` : "Lab Store";
  const [created] = await tx
    .insert(warehouses)
    .values({
      workspaceid,
      name,
      warehousetype: "lab",
      description: "Reagents and consumables held by this laboratory.",
      isactive: true,
    })
    .returning({ id: warehouses.id, name: warehouses.name });

  return created;
}
