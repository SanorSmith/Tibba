/**
 * Suppliers for a pharmacy's inventory.
 *
 * This route previously opened its own connection pool, wrote every new
 * supplier into one hardcoded workspace, and checked for a signed-in user on
 * POST only — GET, PATCH and DELETE were open to anyone who could reach the
 * URL. Each handler now names the facility it is acting for, proves the
 * caller belongs to it, and runs through the shared connection so row-level
 * security scopes the statement.
 */
import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

type Row = Record<string, unknown>;

/** Rejects unless the caller is signed in and belongs to the named facility. */
async function authorize(workspaceid: string | null | undefined) {
  const user = await getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!workspaceid || !(await isWorkspaceMember(user.userid, workspaceid))) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

export async function GET(req: NextRequest) {
  const workspaceid = req.nextUrl.searchParams.get("workspaceid");
  const auth = await authorize(workspaceid);
  if (auth.error) return auth.error;

  const search = req.nextUrl.searchParams.get("search") ?? "";
  const like = `%${search}%`;

  try {
    return await withTenant(workspaceid!, async () => {
      const rows = (await db.execute(sql`
        SELECT
          s.supplierid AS id,
          s.name,
          s.code,
          s.contactperson AS "contactPerson",
          s.email,
          s.phonenumber AS phone,
          s.addressline1 AS address,
          s.category,
          s.type,
          s.isactive AS "isActive",
          s.createdat AS "createdAt",
          0 AS "drugCount"
        FROM suppliers s
        WHERE s.isactive = true
          AND (${search} = '' OR s.name ILIKE ${like} OR s.contactperson ILIKE ${like}
               OR s.email ILIKE ${like} OR s.phonenumber ILIKE ${like})
        ORDER BY s.name
      `)) as unknown as Row[];
      return NextResponse.json(rows);
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { workspaceid, name, code, contactPerson, email, phone, address, category, type } = body;

  const auth = await authorize(workspaceid);
  if (auth.error) return auth.error;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const supplierCode = code || `SUP-${Date.now().toString().slice(-8)}`;
  const supplierCategory = category || "general";
  const supplierType = type || "vendor";

  try {
    return await withTenant(workspaceid, async () => {
      const rows = (await db.execute(sql`
        INSERT INTO suppliers (supplierid, workspaceid, name, code, contactperson, email,
                               phonenumber, addressline1, category, type, createdby, isactive, createdat)
        VALUES (${crypto.randomUUID()}, ${workspaceid}, ${name}, ${supplierCode},
                ${contactPerson ?? null}, ${email ?? null}, ${phone ?? null}, ${address ?? null},
                ${supplierCategory}, ${supplierType}, ${auth.user!.userid}, true, NOW())
        RETURNING supplierid AS id, name, code, contactperson AS "contactPerson", email,
                  phonenumber AS phone, addressline1 AS address, category, type
      `)) as unknown as Row[];

      // Procurement reads a different table. Its "Select supplier" dropdown,
      // its purchase orders and its goods receipts are all built on `vendors`
      // - pharmacy_purchase_orders.supplier_id and pharmacy_orders.vendorid
      // are foreign keys to it - so a supplier registered only here was
      // invisible the moment the pharmacist went to order from them, with
      // nothing on either screen saying the two lists were different.
      //
      // Registering a supplier therefore registers the vendor too. Guarded by
      // name so registering an existing supplier again does not duplicate it.
      //
      // This mirrors rather than unifies, which is a wart worth removing: one
      // supplier belongs in one table. Doing that properly means migrating
      // four foreign keys, so the bridge stands until then.
      await db.execute(sql`
        INSERT INTO vendors (id, workspaceid, name, code, contactname, phone,
                             email, address, isactive, createdat, updatedat)
        SELECT gen_random_uuid(), ${workspaceid}::uuid, ${name}, ${supplierCode},
               ${contactPerson ?? null}, ${phone ?? null}, ${email ?? null},
               ${address ?? null}, true, NOW(), NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM vendors v
           WHERE v.workspaceid = ${workspaceid}::uuid
             AND lower(trim(v.name)) = lower(trim(${name}))
        )
      `);

      return NextResponse.json(rows[0]);
    });
  } catch (error) {
    console.error("Error creating supplier:", error);
    const message = error instanceof Error ? error.message : "Failed to create supplier";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { workspaceid, id, name, contactPerson, email, phone, address } = body;

  const auth = await authorize(workspaceid);
  if (auth.error) return auth.error;

  if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

  return await withTenant(workspaceid, async () => {
    const rows = (await db.execute(sql`
      UPDATE suppliers SET
        name          = COALESCE(${name ?? null}, name),
        contactperson = COALESCE(${contactPerson ?? null}, contactperson),
        email         = COALESCE(${email ?? null}, email),
        phonenumber   = COALESCE(${phone ?? null}, phonenumber),
        addressline1  = COALESCE(${address ?? null}, addressline1)
      WHERE supplierid = ${id}
      RETURNING supplierid AS id, name, contactperson AS "contactPerson", email,
                phonenumber AS phone, addressline1 AS address
    `)) as unknown as Row[];

    if (!rows.length) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  });
}

export async function DELETE(req: NextRequest) {
  const { workspaceid, id } = await req.json();

  const auth = await authorize(workspaceid);
  if (auth.error) return auth.error;

  return await withTenant(workspaceid, async () => {
    await db.execute(sql`UPDATE suppliers SET isactive = false WHERE supplierid = ${id}`);
    return NextResponse.json({ success: true });
  });
}
