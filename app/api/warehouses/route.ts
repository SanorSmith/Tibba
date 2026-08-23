import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { warehouses, warehouseSections, inventoryStock } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET() {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const all = await db.select().from(warehouses).where(eq(warehouses.isactive, true)).orderBy(warehouses.name);

    const enriched = await Promise.all(all.map(async (w) => {
      const [{ sectioncount }] = await db
        .select({ sectioncount: sql<number>`count(*)` })
        .from(warehouseSections)
        .where(eq(warehouseSections.warehouseid, w.id));

      const [{ stockcount }] = await db
        .select({ stockcount: sql<number>`coalesce(sum(quantity), 0)` })
        .from(inventoryStock)
        .where(eq(inventoryStock.warehouseid, w.id));

      return { ...w, sectioncount: Number(sectioncount), totalstock: Number(stockcount) };
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch warehouses" }, { status: 500 });
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

    const { name, location, manager, description, warehousetype, workspaceid } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: "Warehouse name is required" }, { status: 400 });
    // A warehouse without an owner is how Pharma's stock ended up inside
    // Alis's warehouse — every warehouse belongs to exactly one facility.
    if (!workspaceid) return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });

    const [created] = await db.insert(warehouses).values({
      name, location, manager, description, workspaceid,
      warehousetype: warehousetype ?? "hospital",
    }).returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create warehouse" }, { status: 500 });
  }
}
