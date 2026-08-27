import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { WorkspacePicker, type PickerWorkspace } from "./workspace-picker";

export default async function Home() {
  const user = await getUser();

  if (!user) {
    redirect("/");
  }

  const workspaces = await getUserWorkspaces(user.userid);

  // If user has no workspaces, redirect to new workspace creation
  if (!workspaces || workspaces.length === 0) {
    if (user.permissions?.includes("admin")) {
      redirect("/d/admin");
    } else {
      redirect("/d/empty");
    }
  }

  // One facility is not a choice — go straight in, as before.
  if (workspaces.length === 1) {
    redirect(`/d/${workspaces[0].workspace.workspaceid}`);
  }

  // More than one, so ask. This used to redirect to `workspaces[0]`, which is
  // ordered by facility creation date: someone who is a doctor at one hospital
  // and an administrator at another landed in whichever was created more
  // recently, and a newly created facility quietly became everyone's default.
  const options: PickerWorkspace[] = workspaces.map((w) => ({
    workspaceid: w.workspace.workspaceid,
    name: w.workspace.name?.trim() || "Untitled facility",
    type: w.workspace.type ?? null,
    role: w.role,
  }));

  return <WorkspacePicker workspaces={options} />;
}
