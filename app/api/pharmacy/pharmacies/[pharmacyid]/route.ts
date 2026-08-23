/**
 * API: /api/pharmacy/pharmacies/[pharmacyid]
 * - PATCH: update pharmacy information (tenant-isolated)
 * - DELETE: delete pharmacy (tenant-isolated)
 * - Role: authenticated users
 *
 * NOTE: Requires workspaceid as a query parameter.
 * Prefer using /api/d/[workspaceid]/pharmacies/[pharmacyid] instead.
 */

/**
 * Scoped through `withPharmacySchema` rather than `withTenant`; see the
 * membership check in each handler.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import {
  pharmacySql,
  withPharmacySchema,
} from "@/lib/db/pharmacy-db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pharmacyid: string }> },
) {
  const { pharmacyid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceid = req.nextUrl.searchParams.get("workspaceid");
  if (!workspaceid) {
    return NextResponse.json({ error: "workspaceid query param required" }, { status: 400 });
  }

  // A query parameter is caller input like any other, so belonging is proved
  // before it is used as the tenant identity.
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const allowed = ["name", "phone", "email", "address", "city", "namear", "nameku",
    "latitude", "longitude", "deliveryfee", "minorderamount",
    "avgdeliverytimeminutes", "rating", "isactive", "logourl"];
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let idx = 2;
  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = $${idx}`);
      values.push(body[key] ?? null);
      idx++;
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No updatable fields" }, { status: 400 });
  }

  updates.push(`updatedat = now()`);

  try {
    const res = await withPharmacySchema(
      pharmacySql,
      workspaceid,
      async (tx) => {
        return tx.unsafe(
          `UPDATE pharmacies SET ${updates.join(", ")} WHERE pharmacyid = $1 RETURNING *`,
          [pharmacyid, ...values]
        );
      }
    );

    if (!res.length) {
      return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 });
    }

    return NextResponse.json({ pharmacy: res[0] });
  } catch (e) {
    console.error("[pharmacies][PATCH] error:", e);
    return NextResponse.json({ error: "Failed to update pharmacy" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ pharmacyid: string }> },
) {
  const { pharmacyid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceid = req.nextUrl.searchParams.get("workspaceid");
  if (!workspaceid) {
    return NextResponse.json({ error: "workspaceid query param required" }, { status: 400 });
  }

  // A query parameter is caller input like any other, so belonging is proved
  // before it is used as the tenant identity.
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const res = await withPharmacySchema(
      pharmacySql,
      workspaceid,
      async (tx) => {
        return tx`
          DELETE FROM pharmacies WHERE pharmacyid = ${pharmacyid} RETURNING *
        `;
      }
    );

    if (!res.length) {
      return NextResponse.json({ error: "Pharmacy not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, deleted: res[0] });
  } catch (e) {
    console.error("[pharmacies][DELETE] error:", e);
    return NextResponse.json({ error: "Failed to delete pharmacy" }, { status: 500 });
  }
}
