/**
 * Vendors, listed and created for one facility.
 *
 * This route opened its own connection and named no facility at all: the list
 * returned every hospital's suppliers, and a new vendor was inserted with no
 * owner. That second half would stop working outright once row-level security
 * is enforcing — the write policy requires the row to belong to the facility
 * doing the writing — so setting it is a fix, not a formality.
 */
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db/pool";
import { withTenant } from "@/lib/db/tenant";
import { requireWorkspace } from "@/lib/db/require-workspace";

export async function GET(req: NextRequest) {
  const auth = await requireWorkspace(req);
  if (auth.error) return auth.error;

  const search = req.nextUrl.searchParams.get("search") ?? "";

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `SELECT * FROM vendors
       WHERE isactive = true
         AND ($1 = '' OR name ILIKE $1 OR contactname ILIKE $1 OR email ILIKE $1 OR code ILIKE $1)
       ORDER BY name`,
      [`%${search}%`],
    );
    return NextResponse.json(r.rows);
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const auth = await requireWorkspace(req, body.workspaceid ?? body.workspaceId);
  if (auth.error) return auth.error;

  const { name, code, contactPerson, phone, email, address, country, paymentTerms, currency, notes } =
    body;
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  return await withTenant(auth.workspaceid, async () => {
    const r = await pool.query(
      `INSERT INTO vendors (id, workspaceid, name, code, contactname, phone, email, address,
                            country, paymentterms, currency, notes, isactive, createdat, updatedat)
       VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,NOW(),NOW()) RETURNING *`,
      [
        auth.workspaceid,
        name,
        code || null,
        contactPerson || null,
        phone || null,
        email || null,
        address || null,
        country || null,
        paymentTerms || null,
        currency || "USD",
        notes || null,
      ],
    );
    return NextResponse.json(r.rows[0]);
  });
}
