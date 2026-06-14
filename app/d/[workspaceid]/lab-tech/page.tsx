import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ workspaceid: string }>;
}

export default async function LabTechRedirect({ params }: PageProps) {
  const { workspaceid } = await params;
  redirect(`/d/${workspaceid}/lims/lab-tech`);
}
