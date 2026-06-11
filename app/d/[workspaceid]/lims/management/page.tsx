/**
 * LIMS Management Page
 * 
 * Manages laboratory test reference ranges and test packages for the LIMS system
 */
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Package } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/user";
import TestReferenceManager from "./components/TestReferenceManager";
import TestPackageManager from "./components/TestPackageManager";

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
        <h1 className="text-base font-bold">Laboratory Management</h1>
      </div>

      {/* Management Tabs */}
      <Tabs defaultValue="test-references" className="space-y-1">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="test-references" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Test References
          </TabsTrigger>
          <TabsTrigger value="test-packages" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Test Packages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-references" className="space-y-4">
          <TestReferenceManager workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="test-packages" className="space-y-4">
          <TestPackageManager workspaceid={workspaceid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
