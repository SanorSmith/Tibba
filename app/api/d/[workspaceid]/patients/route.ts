/**
 * API: /api/d/[workspaceid]/patients
 * - GET: list patients for the given workspace (auth required)
 * - POST: create a patient (requires workspace administrator, global admin, or doctor)
 * - Uses Drizzle ORM and Next.js App Router route handlers.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, workspaces } from "@/lib/db/schema";
import { eq, and, asc, ilike, or, isNull } from "drizzle-orm";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { createOpenEHREHR, getOpenEHREHRBySubjectId } from "@/lib/openehr/openehr";
import { randomUUID } from "crypto";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  // Await dynamic params per project convention
  const { workspaceid } = await params;
  // Ensure only authenticated users can read workspace data
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Signed in is not the same as belonging here: without this, one
  // facility's data is reachable by changing the id in the request.
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Runs with this facility's identity on the connection, so row-level
  // security scopes every query below in the database itself.
  return await withTenant(workspaceid, async () => {
  try {
    // Get search parameter from URL
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get("search");

    // Build query conditions
    //
    // The default used to be "this facility's patients, plus global ones",
    // where global meant workspaceid IS NULL. That NULL pool was the shared
    // patient index across the ERP, Tibbna and the patient app - 160 rows
    // every facility could see. Attributing and clearing those rows emptied
    // it, and a lab receiving a referred order could no longer find the
    // patient the order was for: Hospital 1 sends a test order for Salam ALI
    // to Lab one, the order arrives, and the patient is invisible.
    //
    // Patients are shared-read by design - migration 0068 gives this table
    // `FOR SELECT USING (true)` on the principle that identity is shared while
    // clinical and financial records are not. So the facility filter is
    // dropped and row-level security decides instead. Sharing identity is not
    // sharing records: invoices, diagnoses and results stay scoped.
    //
    // ?workspaceOnly=true still narrows to this facility's own patients, for
    // callers that want a registration list rather than a search.
    const workspaceOnly = searchParams.get("workspaceOnly") === "true";
    const conditions = workspaceOnly
      ? [eq(patients.workspaceid, workspaceid)]
      : [];
    
    // Add search filter if provided
    if (searchTerm && searchTerm.trim().length > 0) {
      const searchPattern = `%${searchTerm.trim()}%`;
      const searchCondition = or(
        ilike(patients.firstname, searchPattern),
        ilike(patients.lastname, searchPattern),
        ilike(patients.nationalid, searchPattern)
      )!;
      
      // Search across whatever the policy allows; no facility clause here.
      conditions.push(searchCondition);
    }

    // Fetch patients with workspace info
    const rows = await db
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
        isGlobal: isNull(patients.workspaceid),
      })
      .from(patients)
      .leftJoin(workspaces, eq(patients.workspaceid, workspaces.workspaceid))
      .where(and(...conditions))
      .orderBy(asc(patients.createdat));

    // Separate workspace and global patients for summary
    const workspacePatients = rows.filter(p => !p.isGlobal);
    const globalPatients = rows.filter(p => p.isGlobal);
    
    return NextResponse.json({ 
      patients: rows,
      summary: {
        total: rows.length,
        workspaceSpecific: workspacePatients.length,
        global: globalPatients.length,
        workspaceOnly,
      }
    });
  } catch (e) {
    // Surface the error server-side and return a generic message to clients
    console.error("[patients][GET] error:", e);
    return NextResponse.json({ error: "Failed to load patients" }, { status: 500 });
  }
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  // Await dynamic params per project convention
  const { workspaceid } = await params;
  // Require authentication for creating a patient
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Signed in is not the same as belonging here: without this, one
  // facility's data is reachable by changing the id in the request.
  if (!(await isWorkspaceMember(user.userid, workspaceid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Runs with this facility's identity on the connection, so row-level
  // security scopes every query below in the database itself.
  return await withTenant(workspaceid, async () => {

  // Verify the user is administrator or doctor in this workspace OR has global admin permission
  const userWorkspaces = await getUserWorkspaces(user.userid);
  const membership = userWorkspaces.find(
    (w) => w.workspace.workspaceid === workspaceid,
  );
  const isWorkspaceAdmin = membership?.role === "administrator";
  const isDoctor = membership?.role === "doctor";
  const isLabTechnician = membership?.role === "lab_technician";
  // Normalize permissions to an array of strings
  const normalizePerms = (perms: unknown): string[] => {
    try {
      if (Array.isArray(perms)) return perms as string[];
      if (typeof perms === "string") {
        const trimmed = perms.trim();
        // Handle cases like "'[\"admin\"]'" or "[\"admin\"]"
        const dequoted = trimmed.startsWith("'") && trimmed.endsWith("'")
          ? trimmed.slice(1, -1)
          : trimmed;
        const parsed = JSON.parse(dequoted);
        if (Array.isArray(parsed)) return parsed as string[];
      }
    } catch {}
    return [];
  };
  const isGlobalAdmin = normalizePerms(user.permissions).includes("admin");
  if (!isWorkspaceAdmin && !isGlobalAdmin && !isDoctor && !isLabTechnician) {
    // Block non-admin, non-doctor users from creating patients
    return NextResponse.json(
      { error: "Only admin, doctor, or lab technician can register a patient" },
      { status: 403 },
    );
  }

  const body = await req.json();
  try {
    // Check if National ID already exists (if provided)
    if (body.nationalid) {
      const existingPatient = await db
        .select()
        .from(patients)
        .where(eq(patients.nationalid, body.nationalid))
        .limit(1);
      
      if (existingPatient.length > 0) {
        return NextResponse.json(
          { error: "A patient with this National ID already exists" },
          { status: 409 }
        );
      }
    }

    // Generate a UUID here so we can use the same value to create the EHR in EHRbase
    const newPatientId = randomUUID();
    const values = {
      patientid: newPatientId,
      workspaceid,
      firstname: String(body.firstname || ""),
      middlename: body.middlename ?? null,
      lastname: String(body.lastname || ""),
      nationalid: body.nationalid ?? null,
      dateofbirth: body.dateofbirth ? String(body.dateofbirth) : null,
      gender: body.gender ?? null,
      bloodgroup: body.bloodgroup ?? null,
      phone: body.phone ?? null,
      email: body.email ?? null,
      address: body.address ?? null,
      medicalhistory: body.medicalhistory ?? {},
    } as const;

    // Check if this should be a global patient
    const isGlobal = body.isGlobal === true;
    
    // Create patient (workspace-specific or global)
    const patientValues = {
      ...values,
      workspaceid: isGlobal ? null : workspaceid, // NULL for global patients
    };

    const [inserted] = await db.insert(patients).values(patientValues).returning();

    // Create EHR in EHRbase using the patient's National ID as subject id
    // Fall back to patient UUID if National ID is not provided
    let ehrId: string | null = null;
        
    // Set a timeout for EHR creation to avoid long waits
    const EHR_CREATION_TIMEOUT = 10000; // 10 seconds
    
    try {
      // Use National ID if available, otherwise use patient UUID
      const subjectId = body.nationalid || newPatientId;
      console.log(`[patients][POST] Creating EHR for subject ID: ${subjectId}`);
      
      // Create EHR with timeout
      const ehrPromise = createOpenEHREHR(subjectId);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('EHR creation timeout')), EHR_CREATION_TIMEOUT)
      );
      
      ehrId = await Promise.race([ehrPromise, timeoutPromise]);
      console.log(`[patients][POST] Successfully created EHR: ${ehrId}`);
    } catch (ehrErr: unknown) {
      // If 409 conflict, EHR already exists - try to fetch it
      const axiosError = ehrErr as { response?: { status?: number; data?: unknown }; status?: number; message?: string };
      const errorMessage = axiosError?.message || String(ehrErr);
      
      if (axiosError?.response?.status === 409 || axiosError?.status === 409) {
        console.log("[patients][POST] EHR already exists (409 conflict), fetching existing EHR ID");
        try {
          const subjectId = body.nationalid || newPatientId;
          ehrId = await getOpenEHREHRBySubjectId(subjectId);
          if (ehrId) {
            console.log("[patients][POST] Found existing EHR:", ehrId);
          } else {
            console.error("[patients][POST] EHR exists but could not be retrieved:", ehrErr);
          }
        } catch (fetchErr) {
          console.error("[patients][POST] Failed to fetch existing EHR:", fetchErr);
        }
      } else if (errorMessage.includes('timeout') || errorMessage.includes('522') || errorMessage.includes('504')) {
        // Timeout or server error - patient will be created without EHR ID
        console.warn("[patients][POST] EHR creation timed out or server unavailable. Patient will be created without EHR ID. EHR ID can be added later.");
      } else {
        console.error("[patients][POST] EHR creation failed:", {
          status: axiosError?.response?.status,
          message: axiosError?.message,
          error: ehrErr
        });
      }
    }

    let updated = inserted;
    if (ehrId) {
      // Persist the returned EHR identifier on the patient record
      const [row] = await db
        .update(patients)
        .set({ ehrid: ehrId })
        .where(eq(patients.patientid, newPatientId))
        .returning();
      updated = row ?? inserted;
    }

    return NextResponse.json({ 
      patient: updated, 
      message: isGlobal 
        ? "Global patient created successfully" 
        : "Workspace-specific patient created successfully"
    }, { status: 201 });
  } catch (e) {
    // Catch any unexpected error in the create flow
    console.error(e);
    return NextResponse.json({ error: "Failed to create patient" }, { status: 500 });
  }
  });
}
