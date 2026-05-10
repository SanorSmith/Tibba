/**
 * Insurance Companies API
 *
 * GET /api/d/[workspaceid]/insurance-companies
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { insuranceCompanies } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getUser } from "@/lib/user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const { workspaceid } = await params;
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Query insurance companies from database
    // Try to filter by workspaceid if provided, otherwise return all active companies
    let companies;
    if (workspaceid) {
      companies = await db
        .select()
        .from(insuranceCompanies)
        .where(
          and(
            eq(insuranceCompanies.workspaceid, workspaceid as string),
            eq(insuranceCompanies.isactive, true)
          )
        );
    } else {
      // If no workspaceid, return all active companies
      companies = await db
        .select()
        .from(insuranceCompanies)
        .where(eq(insuranceCompanies.isactive, true));
    }

    return NextResponse.json({ companies });
  } catch (error) {
    console.error("[Insurance Companies GET]", error);
    return NextResponse.json({ error: "Failed to fetch insurance companies" }, { status: 500 });
  }
}
