import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { CareSidebar } from "@/components/care/care-sidebar";
import { CareTopBar } from "@/components/care/care-topbar";

export default async function CareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  if (!user) {
    redirect("/");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <CareSidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <CareTopBar userName={user.name} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
