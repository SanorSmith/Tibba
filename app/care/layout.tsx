import { getUser } from "@/lib/user";
import { getUserWorkspaces } from "@/lib/db/queries/workspace";
import { WorkspaceUserRole } from "@/lib/db/tables/workspace";
import { redirect } from "next/navigation";
import { CareTopBar } from "@/components/care/care-topbar";
import { CareWorkspaceProvider } from "@/components/care/care-workspace-context";

const careRoles: WorkspaceUserRole[] = ["nurse"];

export default async function CareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/");
  }

  const workspaces = await getUserWorkspaces(user.userid);
  const careWorkspace = workspaces.find((ws) => careRoles.includes(ws.role)) || workspaces[0];
  if (!careWorkspace) {
    redirect("/");
  }

  return (
    <CareWorkspaceProvider workspaceId={careWorkspace.workspace.workspaceid}>
      <div className="care-theme flex h-screen overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-background">
          <CareTopBar user={user} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            {children}
          </main>
        </div>
      </div>
    </CareWorkspaceProvider>
  );
}
