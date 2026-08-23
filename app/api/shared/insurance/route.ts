/**
 * Insurance Companies API
 *
 * GET /api/d/[workspaceid]/insurance-companies
 */

/**
 * Deliberately unscoped: insurance companies are reference data. Every
 * facility bills against the same list, and migration 0068 opens SELECT on
 * that table while keeping writes tenant-scoped, so this read stays correct
 * once row-level security is enforcing.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCompanies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companies = await db
      .select()
      .from(insuranceCompanies)
      .where(eq(insuranceCompanies.isactive, true));

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[Insurance Companies GET]", error);
    return NextResponse.json({ error: "Failed to fetch insurance companies" }, { status: 500 });
  }
}
