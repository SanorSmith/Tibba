/**
 * Page: /d/[workspaceid]/plastic-surgery
 * - Plastic surgeon dashboard showing patients, appointments, and operations
 * - Accessible only to users with plastic_surgeon role
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import PlasticSurgeonDashboard from "./plastic-surgeon-dashboard";
import { db } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { withTenant } from "@/lib/db/tenant";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function PlasticSurgeryPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);

  if (!membership || membership.role !== "plastic_surgeon") {
    redirect(`/d/${workspaceid}`);
  }
  // Membership is already settled above; what is missing is the facility
  // on the connection, so row-level security scopes the reads below.
  return withTenant(workspaceid, async () => {

  let staffInfo = null;
  try {
    const staffRecords = await db
      .select()
      .from(staff)
      .where(
        and(
          eq(staff.workspaceid, workspaceid),
          eq(staff.role, "plastic_surgeon")
        )
      );
    staffInfo = staffRecords.find(
      (s) =>
        s.email === user.email ||
        (user.name &&
          `${s.firstname} ${s.lastname}`
            .toLowerCase()
            .includes(user.name.toLowerCase()))
    );
  } catch (e) {
    console.error("Failed to fetch staff info:", e);
  }

  const surgeonInfo = {
    name: user.name || user.email || "Plastic Surgeon",
    email: user.email || "",
    staffInfo: staffInfo
      ? {
          unit: staffInfo.unit,
          specialty: staffInfo.specialty,
        }
      : undefined,
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <PlasticSurgeonDashboard
        workspaceid={workspaceid}
        surgeonid={user.userid}
        surgeonInfo={surgeonInfo}
      />
    </div>
  );
  });
}
