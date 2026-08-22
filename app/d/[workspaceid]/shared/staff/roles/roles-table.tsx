/**
 * Client Component: RolesTable
 * - Fetches staff data and displays roles with permissions in a table
 * - Shows role-based permissions for each staff member
 * - Role config (label, icon, color, permissions) is fetched from the DB
 */
"use client";
import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Stethoscope,
  Heart,
  TestTube,
  Pill,
  UserCircle,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Shield,
  Stethoscope,
  Heart,
  TestTube,
  Pill,
  UserCircle,
};

type Staff = {
  staffid: string;
  role: string;
  firstname: string;
  middlename?: string | null;
  lastname: string;
  unit?: string | null;
  specialty?: string | null;
  phone?: string | null;
  email?: string | null;
};

type WorkspaceUser = {
  userid: string;
  email: string;
  name: string | null;
  image: string | null;
  permissions: string[];
  role: string;
};

type CombinedMember = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  unit?: string | null;
  specialty?: string | null;
  source: "staff" | "user";
  isAdmin?: boolean;
};

interface DbRole {
  roleid: string;
  workspacetype: string;
  name: string;
  label: string;
  permissions: string[];
  icon: string | null;
  color: string | null;
}

export default function RolesTable({ workspaceid }: { workspaceid: string }) {
  const [members, setMembers] = useState<CombinedMember[] | null>(null);
  const [rolesMap, setRolesMap] = useState<Record<string, DbRole>>({});
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        // Fetch staff, workspace users, and roles in parallel
        const [staffRes, usersRes, rolesRes] = await Promise.all([
          fetch(`/api/d/${workspaceid}/staff`, { cache: "no-store" }),
          fetch(`/api/d/${workspaceid}/users`, { cache: "no-store" }),
          fetch(`/api/admin/workspace-roles`, { cache: "no-store" }),
        ]);

        if (!staffRes.ok || !usersRes.ok) {
          throw new Error("Failed to load data");
        }

        const staffData = await staffRes.json();
        const usersData = await usersRes.json();
        const rolesData = rolesRes.ok ? await rolesRes.json() : { roles: [] };

        if (!active) return;

        // Build roles lookup by name
        const rMap: Record<string, DbRole> = {};
        for (const r of rolesData.roles as DbRole[]) {
          rMap[r.name] = r;
        }
        setRolesMap(rMap);

        // Convert staff to combined format
        const staffMembers: CombinedMember[] = (staffData.staff as Staff[] || []).map((s) => ({
          id: s.staffid,
          name: `${s.firstname} ${s.middlename ? s.middlename + " " : ""}${s.lastname}`,
          email: s.email || null,
          role: s.role,
          unit: s.unit || null,
          specialty: s.specialty || null,
          source: "staff" as const,
        }));

        // Convert workspace users to combined format
        const userMembers: CombinedMember[] = (usersData.users as WorkspaceUser[] || []).map((u) => ({
          id: u.userid,
          name: u.name || u.email,
          email: u.email,
          role: u.role,
          source: "user" as const,
          isAdmin: u.permissions?.includes("admin"),
        }));

        // Combine and remove duplicates (prefer staff entries)
        const staffEmails = new Set(staffMembers.map(s => s.email?.toLowerCase()).filter(Boolean));
        const uniqueUsers = userMembers.filter(u => !staffEmails.has(u.email?.toLowerCase() || ""));

        setMembers([...staffMembers, ...uniqueUsers]);
      } catch (e: unknown) {
        if (!active) return;
        const msg = e instanceof Error ? e.message : "Failed to load data";
        setError(msg);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [workspaceid]);

  const getConfig = (roleName: string) => {
    const dbRole = rolesMap[roleName];
    const Icon = iconMap[dbRole?.icon || ""] || Shield;
    return {
      label: dbRole?.label || roleName,
      icon: Icon,
      color: dbRole?.color || "bg-gray-100 text-gray-800 border-gray-200",
      permissions: dbRole?.permissions || [],
    };
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (members === null) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-muted-foreground">Loading members...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="p-6 text-center">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground">No members found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Member</TableHead>
            <TableHead className="w-[180px]">Role</TableHead>
            <TableHead className="w-[200px]">Unit/Department</TableHead>
            <TableHead>Permissions</TableHead>
            <TableHead className="w-[100px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member: CombinedMember) => {
            const config = getConfig(member.role);
            const Icon = config.icon;
            const permissions = config.permissions;
            const isExpanded = expandedRow === member.id;

            return (
              <TableRow key={member.id} className="hover:bg-muted/50">
                <TableCell>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {member.name}
                      {member.isAdmin && (
                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                          Global Admin
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.email || "No contact"}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${config.color} flex items-center gap-1 w-fit`}>
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {member.unit || <span className="text-muted-foreground italic">Not assigned</span>}
                  </span>
                  {member.specialty && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {member.specialty}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {isExpanded ? (
                    <div className="space-y-1">
                      {permissions.map((permission: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span>{permission}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {permissions.length} permissions
                      </Badge>
                      <button
                        onClick={() => setExpandedRow(member.id)}
                        className="text-xs text-primary hover:underline"
                      >
                        View all
                      </button>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {isExpanded ? (
                    <button
                      onClick={() => setExpandedRow(null)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Collapse
                    </button>
                  ) : (
                    <button
                      onClick={() => setExpandedRow(member.id)}
                      className="text-xs text-primary hover:underline"
                    >
                      Expand
                    </button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
