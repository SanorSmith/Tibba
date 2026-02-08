import { Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function DepartmentsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
        <p className="text-gray-600 mt-1">Manage hospital departments and divisions</p>
      </div>

      <Card>
        <CardContent className="py-12 text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Department Management</h3>
          <p className="text-gray-600">This module integrates with your existing department system</p>
        </CardContent>
      </Card>
    </div>
  );
}
