/**
 * Lab vendors — the suppliers this lab buys reagents from.
 *
 * Uses the shared `vendors` table, which already carries workspaceid, so a lab
 * sees only its own suppliers rather than every vendor on the platform.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const activeOnly = request.nextUrl.searchParams.get("active") === "active";
    const result = activeOnly
      ? await db.execute(sql`
          SELECT id, name, code, contactname, phone, email, address, paymentterms,
                 currency, isactive, totalorders, totalpurchases, lastorderdate, notes
            FROM vendors WHERE workspaceid = ${workspaceid} AND isactive = true ORDER BY name`)
      : await db.execute(sql`
          SELECT id, name, code, contactname, phone, email, address, paymentterms,
                 currency, isactive, totalorders, totalpurchases, lastorderdate, notes
            FROM vendors WHERE workspaceid = ${workspaceid} ORDER BY name`);

    return NextResponse.json({ vendors: Array.from(result as unknown as Record<string, unknown>[]) });
  } catch (error) {
    console.error("[lab vendors GET]", error);
    return NextResponse.json({ error: "Failed to load vendors" }, { status: 500 });
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

    const b = await request.json();
    if (!b.name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const result = await db.execute(sql`
      INSERT INTO vendors (workspaceid, name, code, contactname, phone, email, address,
                           paymentterms, currency, notes, isactive)
      VALUES (${workspaceid}, ${b.name}, ${b.code ?? null}, ${b.contactname ?? null},
              ${b.phone ?? null}, ${b.email ?? null}, ${b.address ?? null},
              ${b.paymentterms ?? null}, ${b.currency ?? null}, ${b.notes ?? null}, true)
      RETURNING id, name`);

    return NextResponse.json({ vendor: Array.from(result as unknown as Record<string, unknown>[])[0] });
  } catch (error) {
    console.error("[lab vendors POST]", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
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

    const b = await request.json();
    if (!b.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    // Scoped by workspace so one lab cannot edit another's supplier record.
    await db.execute(sql`
      UPDATE vendors SET
        name        = COALESCE(${b.name ?? null}, name),
        contactname = COALESCE(${b.contactname ?? null}, contactname),
        phone       = COALESCE(${b.phone ?? null}, phone),
        email       = COALESCE(${b.email ?? null}, email),
        address     = COALESCE(${b.address ?? null}, address),
        isactive    = COALESCE(${b.isactive ?? null}, isactive),
        notes       = COALESCE(${b.notes ?? null}, notes),
        updatedat   = NOW()
      WHERE id = ${b.id} AND workspaceid = ${workspaceid}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[lab vendors PATCH]", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}
