/**
 * Facility details — Server Page
 *
 * The licence number, telephone and address printed on this facility's
 * receipts. Administrators only: these are legal assertions on a printed
 * document, not a display preference.
 */
import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { redirect } from "next/navigation";
import FacilityDetailsClient from "./facility-page";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function FacilityServerPage({ params }: PageProps) {
  const { workspaceid } = await params;
  const user = await getUser();

  if (!user) redirect("/");

  const memberships = await getUserWorkspaces(user.userid);
  const membership = memberships.find(
    (w) => w.workspace.workspaceid === workspaceid,
  );

  if (!membership || membership.role !== "administrator") {
    redirect(`/d/${workspaceid}`);
  }

  return <FacilityDetailsClient workspaceid={workspaceid} />;
}
