"use client";

import { useWorkspaceContext } from "@/contexts/workspaceprovider";
import PatientsList from "./patients-list";

interface PatientsPageClientProps {
  workspaceid: string;
}

export default function PatientsPageClient({ workspaceid }: PatientsPageClientProps) {
  const { workspace } = useWorkspaceContext();
  const userRole = workspace?.role || "receptionist";

  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold">Patients</h1>
            </div>
          </div>
        </div>
      </div>
      <p className="pl-4 mx-auto text-sm text-muted-foreground mt-1">
        View and manage patient records
      </p>

      <PatientsList workspaceid={workspaceid} userRole={userRole} />
    </div>
  );
}
