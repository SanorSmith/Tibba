/**
 * API: /api/d/[workspaceid]/pharmacies/[pharmacyid]
 * - PATCH: update pharmacy information (tenant-isolated)
 * - DELETE: delete pharmacy (tenant-isolated)
 * - Role: authenticated users
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import {
  pharmacySql,
  withPharmacySchema,
} from "@/lib/db/pharmacy-db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string; pharmacyid: string }> },
) {
  const { workspaceid, pharmacyid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  // Build SET clause dynamically from allowed fields
  const allowed = ["name", "phone", "email", "address", "city", "namear", "nameku",
    "latitude", "longitude", "deliveryfee", "minorderamount",
    "avgdeliverytimeminutes", "rating", "isactive", "logourl"];
  const updates: string[] = [];
  const values: (string | number | boolean | null)[] = [];
  let idx = 2; // $1 = pharmacyid
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
  { params }: { params: Promise<{ workspaceid: string; pharmacyid: string }> },
) {
  const { workspaceid, pharmacyid } = await params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
