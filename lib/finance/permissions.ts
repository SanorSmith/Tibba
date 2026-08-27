/**
 * Finance Module — Role-Based Access Control
 *
 * Permission matrix for all finance operations.
 * Uses existing WorkspaceUserRole type + new finance roles.
 */
import { NextRequest, NextResponse } from "next/server";
import { rootDb } from "@/lib/db";
import { workspaceusers } from "@/lib/db/tables/workspace";
import { getUser } from "@/lib/user";
import { sql } from "drizzle-orm";
import type { WorkspaceUserRole } from "@/lib/db/tables/workspace";

// ── Finance Permission Keys ──────────────────────────────────────
export type FinancePermission =
  | "finance:accounts:read"
  | "finance:accounts:write"
  | "finance:journal:read"
  | "finance:journal:create"
  | "finance:journal:post"
  | "finance:journal:reverse"
  | "finance:ap:read"
  | "finance:ap:write"
  | "finance:ap:approve"
  | "finance:ap:pay"
  | "finance:ar:read"
  | "finance:ar:write"
  | "finance:bank:read"
  | "finance:bank:write"
  | "finance:reports:read"
  | "finance:periods:read"
  | "finance:periods:close"
  | "finance:audit:read"
  | "finance:settings:read"
  | "finance:settings:write";

// ── Permission Matrix ────────────────────────────────────────────
// Roles that can access ALL finance features (read + write)
const FINANCE_FULL_ACCESS: readonly string[] = [
  "administrator",
  "pharmacist",
  "finance_manager",
];

// Roles that can read finance data
const FINANCE_READ_ACCESS: readonly string[] = [
  ...FINANCE_FULL_ACCESS,
  "accountant",
  "finance_auditor",
];

const FINANCE_PERMISSIONS: Record<FinancePermission, readonly string[]> = {
  "finance:accounts:read": [...FINANCE_READ_ACCESS],
  "finance:accounts:write": [...FINANCE_FULL_ACCESS],
  "finance:journal:read": [...FINANCE_READ_ACCESS],
  "finance:journal:create": [...FINANCE_FULL_ACCESS, "accountant"],
  "finance:journal:post": [...FINANCE_FULL_ACCESS, "accountant"],
  "finance:journal:reverse": [...FINANCE_FULL_ACCESS],
  "finance:ap:read": [...FINANCE_READ_ACCESS, "ap_clerk"],
  "finance:ap:write": [...FINANCE_FULL_ACCESS, "accountant", "ap_clerk"],
  "finance:ap:approve": [...FINANCE_FULL_ACCESS],
  "finance:ap:pay": [...FINANCE_FULL_ACCESS, "accountant"],
  "finance:ar:read": [...FINANCE_READ_ACCESS, "ar_clerk"],
  "finance:ar:write": [...FINANCE_FULL_ACCESS, "accountant", "ar_clerk"],
  "finance:bank:read": [...FINANCE_READ_ACCESS, "cashier"],
  "finance:bank:write": [...FINANCE_FULL_ACCESS],
  "finance:reports:read": [...FINANCE_READ_ACCESS],
  "finance:periods:read": [...FINANCE_READ_ACCESS],
  "finance:periods:close": [...FINANCE_FULL_ACCESS],
  "finance:audit:read": [...FINANCE_FULL_ACCESS, "finance_auditor"],
  "finance:settings:read": [...FINANCE_READ_ACCESS],
  "finance:settings:write": [...FINANCE_FULL_ACCESS],
};

// ── Permission Check ─────────────────────────────────────────────
export function hasFinancePermission(
  userRole: string,
  permission: FinancePermission
): boolean {
  const allowedRoles = FINANCE_PERMISSIONS[permission];
  return allowedRoles.includes(userRole);
}

// ── Auth Result Type ─────────────────────────────────────────────
export interface FinanceAuthResult {
  user: { userid: string; name: string | null; email: string };
  role: WorkspaceUserRole;
}

// ── API Route Middleware ─────────────────────────────────────────
/**
 * Verify the current user has a specific finance permission for a workspace.
 * Returns the user + role on success, or a NextResponse error on failure.
 */
export async function requireFinancePermission(
  workspaceid: string,
  permission: FinancePermission
): Promise<FinanceAuthResult | NextResponse> {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // A permission gate cannot read `workspaceusers` directly. That table is
  // facility-scoped, and this check runs *before* any tenant is established —
  // so under row-level security it found no membership and refused everyone.
  //
  // `app_user_role_in` is the SECURITY DEFINER function that exists for this
  // exact question, and the one sign-in already uses. Asking whether someone
  // may enter cannot itself require having entered.
  const rows = (await rootDb.execute(
    sql`SELECT public.app_user_role_in(${user.userid}::uuid, ${workspaceid}::uuid) AS role`,
  )) as unknown as Array<{ role: WorkspaceUserRole | null }>;
  const membership = rows[0]?.role ? { role: rows[0].role } : null;

  if (!membership) {
    return NextResponse.json(
      { error: "Not a workspace member" },
      { status: 403 }
    );
  }

  if (!hasFinancePermission(membership.role, permission)) {
    return NextResponse.json(
      { error: "Insufficient permissions for this finance operation" },
      { status: 403 }
    );
  }

  return {
    user: {
      userid: user.userid,
      name: user.name,
      email: user.email,
    },
    role: membership.role,
  };
}
