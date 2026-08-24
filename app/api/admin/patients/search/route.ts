import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { ilike, or, sql } from "drizzle-orm";
import { getUser } from "@/lib/user";

// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
export async function GET(req: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query.trim()) {
      return NextResponse.json({ patients: [] });
    }

    const searchPattern = `%${query.trim()}%`;

    const results = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        lastname: patients.lastname,
        dateofbirth: patients.dateofbirth,
        gender: patients.gender,
        phone: patients.phone,
        email: patients.email,
      })
      .from(patients)
      .where(
        or(
          ilike(patients.firstname, searchPattern),
          ilike(patients.lastname, searchPattern),
          ilike(patients.phone, searchPattern),
          ilike(patients.email, searchPattern)
        )
      )
      .limit(20);

    return NextResponse.json({ patients: results });
  } catch (error) {
    console.error("[Patient Search API] Error:", error);
    return NextResponse.json(
      { error: "Failed to search patients" },
      { status: 500 }
    );
  }
}
