/**
 * API Route: /api/pharmacy/pharmacies
 * - GET: List all pharmacies for a workspace (tenant-isolated)
 * - POST: Create a new pharmacy (tenant-isolated)
 *
 * NOTE: This route requires a workspaceid query parameter since it is
 * not nested under /api/d/[workspaceid]. Consider using the primary
 * route at /api/d/[workspaceid]/pharmacies instead.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import {
  pharmacySql,
  withPharmacySchema,
} from "@/lib/db/pharmacy-db";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceid = req.nextUrl.searchParams.get("workspaceid");
    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceid query param required" }, { status: 400 });
    }

    const allPharmacies = await withPharmacySchema(
      pharmacySql,
      workspaceid,
      async (tx) => {
        return tx`SELECT * FROM pharmacies ORDER BY createdat DESC`;
      }
    );

    return NextResponse.json({ pharmacies: allPharmacies });
  } catch (error) {
    console.error("Error fetching pharmacies:", error);
    return NextResponse.json(
      { error: "Failed to fetch pharmacies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceid, name, phone, email, address, city } = body;

    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceid is required" }, { status: 400 });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Pharmacy name is required" },
        { status: 400 }
      );
    }

    const [newPharmacy] = await withPharmacySchema(
      pharmacySql,
      workspaceid,
      async (tx) => {
        return tx`
          INSERT INTO pharmacies (name, phone, email, address, city)
          VALUES (${name.trim()}, ${phone || null}, ${email || null}, ${address || null}, ${city || null})
          RETURNING *
        `;
      }
    );

    return NextResponse.json({ pharmacy: newPharmacy }, { status: 201 });
  } catch (error) {
    console.error("Error creating pharmacy:", error);
    return NextResponse.json(
      { error: "Failed to create pharmacy" },
      { status: 500 }
    );
  }
}
