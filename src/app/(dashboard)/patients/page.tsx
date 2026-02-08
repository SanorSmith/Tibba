import { UserCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PatientsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
        <p className="text-gray-600 mt-1">Manage patient records and information</p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Patient Management</h3>
          <p className="text-gray-600">This module integrates with your existing FHIR/HL7 patient system</p>
        </CardContent>
      </Card>
    </div>
  );
}
