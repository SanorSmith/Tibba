/**
 * API Route: Patient Medications
 * Manage patient medication profiles
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientMedications, patientAllergies } from "@/lib/db/tables/drug-interaction-logs";
import { desc, eq, and } from "drizzle-orm";
import { getUser } from "@/lib/user";

// Get patient medications and allergies
export async function GET(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceid = searchParams.get("workspaceid");
    const patientid = searchParams.get("patientid");
    const includeAllergies = searchParams.get("includeAllergies") === "true";

    if (!workspaceid || !patientid) {
      return NextResponse.json(
        { error: "workspaceid and patientid are required" },
        { status: 400 }
      );
    }

    // Get active medications
    const medications = await db
      .select()
      .from(patientMedications)
      .where(
        and(
          eq(patientMedications.workspaceid, workspaceid),
          eq(patientMedications.patientid, patientid),
          eq(patientMedications.status, "active")
        )
      )
      .orderBy(desc(patientMedications.startDate));

    let allergies: any[] = [];
    if (includeAllergies) {
      allergies = await db
        .select()
        .from(patientAllergies)
        .where(
          and(
            eq(patientAllergies.workspaceid, workspaceid),
            eq(patientAllergies.patientid, patientid),
            eq(patientAllergies.status, "active")
          )
        )
        .orderBy(desc(patientAllergies.createdat));
    }

    return NextResponse.json({
      medications,
      allergies,
      medicationCount: medications.length,
      allergyCount: allergies.length,
    });
  } catch (error) {
    console.error("Error fetching patient medications:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient medications" },
      { status: 500 }
    );
  }
}

// Add medication to patient profile
export async function POST(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      workspaceid,
      patientid,
      drugid,
      drugname,
      genericname,
      strength,
      form,
      prescribedBy,
      prescribedDate,
      dosage,
      frequency,
      route,
      startDate,
      endDate,
      createdby,
    } = body;

    if (!workspaceid || !patientid || !drugname || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const medication = await db.insert(patientMedications).values({
      workspaceid,
      patientid,
      drugid: drugid || null,
      drugname,
      genericname: genericname || null,
      strength: strength || null,
      form: form || null,
      prescribedBy: prescribedBy || null,
      prescribedDate: prescribedDate ? new Date(prescribedDate) : null,
      dosage: dosage || null,
      frequency: frequency || null,
      route: route || null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      createdby: createdby || null,
    }).returning();

    return NextResponse.json({
      success: true,
      medication: medication[0],
    });
  } catch (error) {
    console.error("Error adding medication:", error);
    return NextResponse.json(
      { error: "Failed to add medication" },
      { status: 500 }
    );
  }
}

// Update medication status (discontinue, etc.)
export async function PATCH(request: NextRequest) {
  try {
    // This route answered anyone who could reach it. There is no facility
    // in scope to check membership against, so this closes what can be
    // closed here: it now requires a signed-in user.
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { medicationid, status, discontinuedReason } = body;

    if (!medicationid || !status) {
      return NextResponse.json(
        { error: "medicationid and status are required" },
        { status: 400 }
      );
    }

    const updated = await db
      .update(patientMedications)
      .set({
        status,
        discontinuedReason: discontinuedReason || null,
        updatedat: new Date(),
      })
      .where(eq(patientMedications.medicationid, medicationid))
      .returning();

    return NextResponse.json({
      success: true,
      medication: updated[0],
    });
  } catch (error) {
    console.error("Error updating medication:", error);
    return NextResponse.json(
      { error: "Failed to update medication" },
      { status: 500 }
    );
  }
}
