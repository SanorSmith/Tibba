import { UserCircle, Plus, Search, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function PatientsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-600 mt-1">Manage patient records and information</p>
        </div>
        <div className="flex gap-3">
          <Link href="/patients/new">
            <button className="btn-primary flex items-center gap-2">
              <Plus size={16} />
              <span className="hidden sm:inline">Add New Patient</span>
            </button>
          </Link>
          <Link href="/reception/patients">
            <button className="btn-secondary flex items-center gap-2">
              <Search size={16} />
              <span className="hidden sm:inline">Search Patients</span>
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/patients/new">
            <CardContent className="py-12 text-center">
              <Plus className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Add New Patient</h3>
              <p className="text-gray-600">Register a new patient in the system</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <Link href="/reception/patients">
            <CardContent className="py-12 text-center">
              <Search className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Search Patients</h3>
              <p className="text-gray-600">Find existing patients by ID, name, or phone</p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 text-purple-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Patient List</h3>
            <p className="text-gray-600">View and manage all patient records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Patient Management System</h3>
          <p className="text-gray-600">This module integrates with your existing FHIR/HL7 patient system</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              🏥 Tibbna Non-Medical DB
            </span>
            <span className="text-xs text-gray-400">Connected to Non-Medical database</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
