/**
 * LIMS Test References Management Page
 * 
 * Manages laboratory test reference ranges for the LIMS system
 */
import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/user";
import TestReferenceManager from "./components/TestReferenceManager";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function LabManagementPage({ params }: PageProps) {
  const { workspaceid } = await params;

  const user = await getUser();
  if (!user) redirect("/");

  return (
    <div className="container mx-auto px-4 pt-2 pb-2 space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href={`/d/${workspaceid}`}>
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to Dashboard"
            className="bg-[#618FF5] border-blue-400 text-white hover:bg-[#618FF5] hover:border-blue-900"
          >
            <FlaskConical className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-base font-bold">Test References - Lab Test Reference Ranges</h1>
      </div>

      {/* Test References Manager */}
      <div className="space-y-4">
        <TestReferenceManager workspaceid={workspaceid} />
      </div>
    </div>
  );
}
