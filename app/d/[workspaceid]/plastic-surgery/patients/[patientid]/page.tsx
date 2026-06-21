/**
 * Page: /d/[workspaceid]/plastic-surgery/patients/[patientid]
 * - Individual patient view for plastic surgeon
 * - Only accessible to plastic_surgeon role
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import PlasticSurgeryPatientDashboard from "./plastic-surgery-patient-dashboard";

interface PageProps {
  params: Promise<{ workspaceid: string; patientid: string }>;
}

export default async function PlasticSurgeryPatientPage({ params }: PageProps) {
  const { workspaceid, patientid } = await params;
  const user = await getUser();

  if (!user) redirect("/");

  const workspaces = await getUserWorkspaces(user.userid);
  const membership = workspaces.find((w) => w.workspace.workspaceid === workspaceid);

  if (!membership || membership.role !== "plastic_surgeon") {
    redirect(`/d/${workspaceid}`);
  }

  const patientRecords = await db
    .select()
    .from(patients)
    .where(eq(patients.patientid, patientid))
    .limit(1);

  if (!patientRecords[0]) {
    redirect(`/d/${workspaceid}/plastic-surgery`);
  }

  const patient = patientRecords[0];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <PlasticSurgeryPatientDashboard
        workspaceid={workspaceid}
        patient={patient}
        surgeonid={user.userid}
      />
    </div>
  );
}
