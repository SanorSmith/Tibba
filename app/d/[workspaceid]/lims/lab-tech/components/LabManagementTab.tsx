/**
 * Lab Management Tab Component
 * 
 * Manages laboratory test reference ranges and test packages for the LIMS system
 */
"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical, Package } from "lucide-react";
import TestReferenceManager from "../../management/components/TestReferenceManager";
import TestPackageManager from "../../management/components/TestPackageManager";

export default function LabManagementTab({ workspaceid }: { workspaceid: string }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Management Tabs */}
      <Tabs defaultValue="test-references" className="flex flex-col h-full min-h-0">
        <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
          <TabsTrigger 
            value="test-references" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
          >
            <FlaskConical className="h-4 w-4" />
            Test References
          </TabsTrigger>
          <TabsTrigger 
            value="test-packages" 
            className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
          >
            <Package className="h-4 w-4" />
            Test Packages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-references" className="flex-1 min-h-0 mt-2 overflow-hidden">
          <TestReferenceManager workspaceid={workspaceid} />
        </TabsContent>

        <TabsContent value="test-packages" className="flex-1 min-h-0 mt-2 overflow-hidden">
          <TestPackageManager workspaceid={workspaceid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
