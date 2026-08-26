/**
 * Manufacturers, per facility.
 *
 * Both handlers used a hardcoded workspace id — Hospital 1's — so every
 * facility read Hospital 1's manufacturer list, and every manufacturer any of
 * them created was filed under Hospital 1. The facility now comes from the
 * request and is proved against membership.
 *
 * The route also opened its own connection, so it ran outside the tenant
 * regardless.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { requireWorkspace } from "@/lib/db/require-workspace";

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req);
  if (auth.error) return auth.error;

  const search = req.nextUrl.searchParams.get("search") ?? "";

  try {
    return await withTenant(auth.workspaceid, async () => {
      const r = await pool.query(
        `SELECT * FROM manufacturers
         WHERE workspace_id = $1 AND isactive = true
           AND ($2 = '' OR name ILIKE $2 OR country ILIKE $2 OR code ILIKE $2)
         ORDER BY name`,
        [auth.workspaceid, `%${search}%`],
      );
      return NextResponse.json(r.rows);
    });
  } catch (error) {
    console.error("Error fetching manufacturers:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = await requireWorkspace(req, body.workspaceid ?? body.workspaceId);
  if (auth.error) return auth.error;

  const {
    name, code, country, contactname, phone, email,
    address, website, license_number, product_types, notes,
  } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `INSERT INTO manufacturers (id, workspace_id, name, code, country, contactname, phone, email,
                                  address, website, license_number, product_types, notes,
                                  isactive, createdat, updatedat)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,NOW(),NOW()) RETURNING *`,
      [
        auth.workspaceid,
        name,
        code || null,
        country || null,
        contactname || null,
        phone || null,
        email || null,
        address || null,
        website || null,
        license_number || null,
        product_types || null,
        notes || null,
      ],
    );
    return NextResponse.json(r.rows[0]);
  });
}
