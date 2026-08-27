/**
 * API Route: /api/d/[workspaceid]/users
 * - GET: List all users in a workspace with their roles
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { db } from "@/lib/db";
import { withTenant } from "@/lib/db/tenant";
import { workspaceusers } from "@/lib/db/schema";
import { users } from "@/lib/db/tables/user";
import { eq } from "drizzle-orm";

/**
 * GET /api/d/[workspaceid]/users
 * 
 * Retrieves all users in a specific workspace with their roles.
 * 
 * @param req - Next.js request object
 * @param params - Route parameters (awaited Promise containing workspaceid)
 * 
 * @returns JSON response with users array or error message
 * 
 * @example
 * // Success response (200)
 * {
 *   "users": [
 *     {
 *       "userid": "uuid",
 *       "email": "user@example.com",
 *       "firstname": "John",
 *       "lastname": "Doe",
 *       "role": "doctor",
 *       "permissions": ["admin"]
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
 * - Returns all users who are members of the workspace
 * - Includes workspace role and global permissions
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

    // `workspaceusers` is facility-scoped, and this read named the facility
    // in its WHERE without ever adopting it — so under row-level security it
    // returned nobody. The workspace is right there in the path.
    const workspaceUsers = await withTenant(workspaceid, async () => db
      .select({
        userid: users.userid,
        email: users.email,
        name: users.name,
        image: users.image,
        permissions: users.permissions,
        role: workspaceusers.role,
      })
      .from(workspaceusers)
      .innerJoin(users, eq(workspaceusers.userid, users.userid))
      .where(eq(workspaceusers.workspaceid, workspaceid)));

    return NextResponse.json({ users: workspaceUsers });
  } catch (error) {
    console.error("Error fetching workspace users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
