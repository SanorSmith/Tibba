/**
 * API Route: /api/d/[workspaceid]/pharmacies
 * - GET: List all pharmacies for a workspace (tenant-isolated)
 * - POST: Create a new pharmacy (tenant-isolated)
 *
 * Each pharmacy workspace has its own Postgres schema. Queries run
 * within a transaction that sets search_path to the tenant schema.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import {
  pharmacySql,
  withPharmacySchema,
} from "@/lib/db/pharmacy-db";

/**
 * GET /api/d/[workspaceid]/pharmacies
 *
 * Retrieves all pharmacies in the tenant schema for this workspace.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;

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

/**
 * POST /api/d/[workspaceid]/pharmacies
 *
 * Creates a new pharmacy record in the tenant schema.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceid } = await params;
    const body = await req.json();

    const { name, phone, email, address, city } = body;

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
