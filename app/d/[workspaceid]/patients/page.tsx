/**
 * Page: /d/[workspaceid]/patients
 * - Lightweight server component that renders the Patients list page.
 * - Delegates all logic to client component to avoid duplicate database queries.
 */
import PatientsPageClient from "./patients-page-client";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function PatientsPage({ params }: PageProps) {
  const { workspaceid } = await params;
  
  return <PatientsPageClient workspaceid={workspaceid} />;
}
