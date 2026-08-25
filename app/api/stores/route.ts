import { NextResponse } from "next/server";
import { db as db } from "@/lib/db";
import { stores, warehouses, storeStock, items } from "@/lib/db/schema";
import { eq, and, count, sum } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";


export async function GET(req: Request) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // The facility must come from the caller and be proved. This route had a
    // hardcoded workspace id, so every store belonged to Hospital 1 whoever
    // created it and whichever facility asked for the list.
    const workspaceid = new URL(req.url).searchParams.get("workspaceid");
    if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {

    const rows = await db
      .select()
      .from(stores)
      .where(and(eq(stores.isactive, true), eq(stores.workspaceid, workspaceid)))
      .orderBy(stores.name);

    // enrich with stock count per store
    const enriched = await Promise.all(rows.map(async (store) => {
      let stockcount = 0, totalstock = 0;
      try {
        const [stats] = await db
          .select({ stockcount: count(storeStock.id), totalstock: sum(storeStock.quantity) })
          .from(storeStock)
          .where(eq(storeStock.storeid, store.id));
        stockcount = Number(stats?.stockcount ?? 0);
        totalstock = Number(stats?.totalstock ?? 0);
      } catch (_) {}
      return { ...store, stockcount, totalstock };
    }));

    return NextResponse.json(enriched);
    });
  } catch (error) {
    console.error("Stores GET error:", error);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
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
    const { name, storetype, department, warehouseid, manager, location, description, workspaceid } = body;

    if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {

    const [created] = await db.insert(stores).values({
      workspaceid: workspaceid,
      name, storetype: storetype ?? "sub",
      department, warehouseid, manager, location, description,
    }).returning();

    return NextResponse.json(created, { status: 201 });
    });
  } catch (error) {
    console.error("Stores POST error:", error);
    return NextResponse.json({ error: "Failed to create store" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await db.update(stores).set({ isactive: false, updatedat: new Date() }).where(eq(stores.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stores DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete store" }, { status: 500 });
  }
}
