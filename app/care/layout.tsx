import { getUser } from "@/lib/user";
import { redirect } from "next/navigation";
import { CareSidebar } from "@/components/care/care-sidebar";

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
      <main className="flex-1 overflow-y-auto p-4 bg-background">
        {children}
      </main>
    </div>
  );
}
