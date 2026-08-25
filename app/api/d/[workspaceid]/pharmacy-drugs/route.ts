/**
 * Pharmacy Drugs CRUD API — GLOBAL catalog (shared across all workspaces)
 * GET  — list all drugs with search (no workspace filter)
 * POST — register a new drug (stores creating workspace for reference)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drugs } from "@/lib/db/schema";
import { or, ilike, desc } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";

    let whereClause;
    if (search.trim()) {
      const pattern = `%${search.trim()}%`;
      whereClause = or(
        ilike(drugs.name, pattern),
        ilike(drugs.genericname, pattern),
        ilike(drugs.nationalcode, pattern),
        ilike(drugs.barcode, pattern)
      );
    }

    const query = db.select().from(drugs);
    if (whereClause) {
      query.where(whereClause);
    }
    const rows = await query.orderBy(desc(drugs.createdat));

    return NextResponse.json({ drugs: rows });
    });
  } catch (error) {
    console.error("[Pharmacy Drugs GET]", error);
    return NextResponse.json({ error: "Failed to fetch drugs" }, { status: 500 });
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
    // Signed in is not the same as belonging here: without this, one
    // facility's data is reachable by changing the id in the request.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Runs with this facility's identity on the connection, so row-level
    // security scopes every query below in the database itself.
    return await withTenant(workspaceid, async () => {

    const body = await request.json();

    if (!body.name || !body.form || !body.strength) {
      return NextResponse.json(
        { error: "Drug name, dose form, and strength are required" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(drugs)
      .values({
        workspaceid,
        name: body.name,
        genericname: body.genericname || null,
        atccode: body.atccode || null,
        form: body.form,
        strength: body.strength,
        unit: body.unit || "tablet",
        barcode: body.barcode || null,
        manufacturer: body.manufacturer || null,
        nationalcode: body.nationalcode || null,
        route: body.route || null,
        interaction: body.interaction || null,
        warning: body.warning || null,
        pregnancy: body.pregnancy || null,
        sideeffect: body.sideeffect || null,
        storagetype: body.storagetype || null,
        indication: body.indication || null,
        traffic: body.traffic || null,
        insuranceapproved: body.insuranceapproved ?? false,
        requiresprescription: body.requiresprescription ?? true,
        metadata: body.metadata || {},
      })
      .returning();

    return NextResponse.json({ drug: inserted }, { status: 201 });
    });
  } catch (error) {
    console.error("[Pharmacy Drugs POST]", error);
    return NextResponse.json({ error: "Failed to register drug" }, { status: 500 });
  }
}
