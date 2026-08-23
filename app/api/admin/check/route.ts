/**
 * API: /api/d/[workspaceid]/admin-check
 * - Diagnostic endpoint to inspect the current user's admin status for a workspace.
 * - Returns membership role, global admin detection, and effectiveAdmin boolean.
 * - Useful for debugging access to patient registration features.
 */
import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";

// Reads across facilities on purpose: admin tooling and the sign-in flow
// both need to look beyond a single workspace — sign-in has to find the
// user before it can know which facility they belong to. Marked with
// withoutTenant so these stay findable, and so it is obvious in review
// that the absence of a tenant scope here is a decision, not an omission.
// Requires a connection holding BYPASSRLS (app_admin); under app_user
// these return nothing, which is the safe direction for a mistake.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceid: string }> },
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Await dynamic params per project convention
  const { workspaceid } = await params;
  // Find the user's role for this workspace
  const uws = await getUserWorkspaces(user.userid);
  const membership = uws.find((w) => w.workspace.workspaceid === workspaceid);
  const isWorkspaceAdmin = membership?.role === "administrator";
  // Normalize permissions because DB may store JSON array or stringified JSON
  const normalizePerms = (perms: unknown): string[] => {
    try {
      if (Array.isArray(perms)) return perms as string[];
      if (typeof perms === "string") {
        const trimmed = perms.trim();
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

  // Return a diagnostic payload useful for gating UI and debugging access
  return NextResponse.json({
    ok: true,
    user: { id: user.userid, email: user.email, permissions: user.permissions },
    workspaceid,
    membershipRole: membership?.role ?? null,
    isWorkspaceAdmin: !!isWorkspaceAdmin,
    isGlobalAdmin: !!isGlobalAdmin,
    effectiveAdmin: !!(isWorkspaceAdmin || isGlobalAdmin),
  });
}
