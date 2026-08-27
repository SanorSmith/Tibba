/**
 * API Route: /api/d/[workspaceid]/departments
 * - GET: List all departments for a workspace
 * - POST: Create a new department
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { departments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isWorkspaceMember } from "@/lib/lims/require-membership";
import { withTenant } from "@/lib/db/tenant";

/**
 * GET /api/d/[workspaceid]/departments
 * 
 * Retrieves all departments associated with a specific workspace.
 * 
 * @param req - Next.js request object
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with departments array or error message
 * 
 * @example
 * // Success response (200)
 * {
 *   "departments": [
 *     {
 *       "id": "uuid",
 *       "workspaceid": "workspace-uuid",
 *       "name": "Department Name",
 *       "phone": "+1234567890",
 *       "email": "dept@example.com",
 *       "address": "123 Main St",
 *       "createdat": "2024-01-01T00:00:00Z",
 *       "updatedat": "2024-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 * 
 * @throws {401} Unauthorized - User not authenticated
 * @throws {500} Internal Server Error - Database or server error
 * 
 * @remarks
 * - Requires user authentication via getUser()
 * - Params must be awaited before accessing properties (Next.js 15+)
 * - Returns empty array if no departments found for workspace
 */
// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
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

    // Naming the facility in the WHERE is not the same as adopting it: with no
    // tenant this listed nothing at all.
    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {
      const allDepartments = await db
        .select()
        .from(departments)
        .where(eq(departments.workspaceid, workspaceid));

      return NextResponse.json({ departments: allDepartments });
    });
  } catch (error) {
    console.error("Error fetching departments:", error);
    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/d/[workspaceid]/departments
 * 
 * Creates a new department within a specific workspace.
 * 
 * @param req - Next.js request object with JSON body
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with created department object or error message
 * 
 * @example
 * // Request body
 * {
 *   "name": "Cardiology",
 *   "phone": "+1234567890",
 *   "email": "cardiology@hospital.com",
 *   "address": "Building A, Floor 3"
 * }
 * 
 * // Success response (201)
 * {
 *   "department": {
 *     "id": "uuid",
 *     "workspaceid": "workspace-uuid",
 *     "name": "Cardiology",
 *     "phone": "+1234567890",
 *     "email": "cardiology@hospital.com",
 *     "address": "Building A, Floor 3",
 *     "createdat": "2024-01-01T00:00:00Z",
 *     "updatedat": "2024-01-01T00:00:00Z"
 *   }
 * }
 * 
 * @throws {400} Bad Request - Missing or invalid department name
 * @throws {401} Unauthorized - User not authenticated
 * @throws {500} Internal Server Error - Database or server error
 * 
 * @remarks
 * - Requires user authentication via getUser()
 * - Department name is required and will be trimmed
 * - Phone, email, and address are optional fields
 * - Params must be awaited before accessing properties (Next.js 15+)
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

    const { name, phone, email, address } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Department name is required" },
        { status: 400 }
      );
    }

    if (!(await isWorkspaceMember(user.userid, workspaceid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await withTenant(workspaceid, async () => {
      const [newDepartment] = await db
        .insert(departments)
        .values({
          workspaceid,
          name: name.trim(),
          phone: phone || null,
          email: email || null,
          address: address || null,
        })
        .returning();

      return NextResponse.json({ department: newDepartment }, { status: 201 });
    });
  } catch (error) {
    console.error("Error creating department:", error);
    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}
