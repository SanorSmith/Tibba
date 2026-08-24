/**
 * API: /api/patients/[patientid] (Global patient access)
 * - GET: Get patient details (any workspace)
 * - PUT: Update patient (any workspace)
 * - DELETE: Delete patient (admin only)
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenantIfOwned } from "@/lib/db/tenant";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientid } = await params;

    // Get patient from ANY workspace
    const [patient] = await db
      .select({
        patientid: patients.patientid,
        firstname: patients.firstname,
        middlename: patients.middlename,
        lastname: patients.lastname,
        nationalid: patients.nationalid,
        dateofbirth: patients.dateofbirth,
        gender: patients.gender,
        bloodgroup: patients.bloodgroup,
        phone: patients.phone,
        email: patients.email,
        address: patients.address,
        ehrid: patients.ehrid,
        medicalhistory: patients.medicalhistory,
        createdat: patients.createdat,
        updatedat: patients.updatedat,
        workspaceid: patients.workspaceid,
        workspaceName: workspaces.name,
      })
      .from(patients)
      .leftJoin(workspaces, eq(patients.workspaceid, workspaces.workspaceid))
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ patient });
  } catch (e) {
    console.error("[global-patient][GET] error:", e);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { patientid } = await params;
    const body = await req.json();

    // Check if patient exists (in any workspace)
    const [existingPatient] = await db
      .select()
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!existingPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // General information is readable from anywhere, but only the facility
    // that registered a patient may change their record. A global patient
    // (no owning facility) stays editable by any signed-in user, which is
    // what "global" has always meant here.
    const owner = existingPatient.workspaceid;
    if (owner && !(await isWorkspaceMember(user.userid, owner))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return withTenantIfOwned(owner, async () => {

    // Check National ID uniqueness if being changed
    if (body.nationalid && body.nationalid !== existingPatient.nationalid) {
      const [conflict] = await db
        .select()
        .from(patients)
        .where(eq(patients.nationalid, body.nationalid))
        .limit(1);

      if (conflict && conflict.patientid !== patientid) {
        return NextResponse.json(
          { error: "A patient with this National ID already exists" },
          { status: 409 }
        );
      }
    }

    // Update patient (no workspace restrictions)
    const updateData: any = {
      updatedat: new Date(),
    };

    // Only update provided fields
    const allowedFields = [
      'firstname', 'middlename', 'lastname', 'nationalid', 
      'dateofbirth', 'gender', 'bloodgroup', 'phone', 'email', 
      'address', 'medicalhistory'
    ];

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    const [updatedPatient] = await db
      .update(patients)
      .set(updateData)
      .where(eq(patients.patientid, patientid))
      .returning();

    return NextResponse.json({ 
      message: "Patient updated successfully",
      patient: updatedPatient 
    });
    });
  } catch (e) {
    console.error("[global-patient][PUT] error:", e);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ patientid: string }> }
) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : 
                          (typeof user.permissions === 'string' ? JSON.parse(user.permissions || '[]') : []);
    
    const isAdmin = userPermissions.includes('admin');
    
    if (!isAdmin) {
      return NextResponse.json({ error: "Only admins can delete patients" }, { status: 403 });
    }

    const { patientid } = await params;

    const [target] = await db
      .select({ workspaceid: patients.workspaceid })
      .from(patients)
      .where(eq(patients.patientid, patientid))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    if (target.workspaceid && !(await isWorkspaceMember(user.userid, target.workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return withTenantIfOwned(target.workspaceid, async () => {

    const [deletedPatient] = await db
      .delete(patients)
      .where(eq(patients.patientid, patientid))
      .returning();

    if (!deletedPatient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Patient deleted successfully" 
    });
    });
  } catch (e) {
    console.error("[global-patient][DELETE] error:", e);
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}
