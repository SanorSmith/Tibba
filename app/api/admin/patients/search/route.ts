import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { ilike, or, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
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
