'use client';

import { useEffect, useState } from 'react';
import { Database } from 'lucide-react';

interface Department {
  department_id?: string;
  department_name?: string;
  department_name_ar?: string;
  location?: string;
  manager_name?: string;
  is_active?: boolean;
  [key: string]: any; // For any additional fields
}

export default function TestDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<string[]>([]);

  useEffect(() => {
    readDepartments();
  }, []);

  const readDepartments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/read-departments');
      const data = await response.json();
      
      if (response.ok) {
        setDepartments(data.departments || []);
        setTables(data.available_tables || []);
        console.log('Departments data:', data);
      } else {
        setError(data.error || 'Failed to read departments');
        setTables(data.available_tables || []);
      }
    } catch (err) {
      setError('Network error: ' + err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">OpenEHR Departments Table Test</h1>
        <a
          href="/openehr-schema-dashboard"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          <Database size={16} />
          Schema Explorer
        </a>
      </div>
      
      {loading && (
        <div className="text-center py-8">
          <div className="text-blue-600">Loading departments from OpenEHR database...</div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-800 font-semibold">Error:</h3>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {tables.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-blue-800 font-semibold">Available Tables in OpenEHR Database:</h3>
          <div className="flex flex-wrap gap-2 mt-2">
            {tables.map(table => (
              <span key={table} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {table}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {departments.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold">
              Departments Found: {departments.length}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {departments.length > 0 && Object.keys(departments[0]).map(key => (
                    <th key={key} className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {departments.map((dept, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {Object.values(dept).map((value, valueIndex) => (
                      <td key={valueIndex} className="px-4 py-2 text-sm text-gray-900">
                        {value === null ? 'NULL' : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {departments.length === 0 && !loading && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-semibold">No departments found</h3>
          <p className="text-yellow-600">The departments table may be empty or doesn't exist.</p>
        </div>
      )}
      
      <div className="mt-6">
        <button
          onClick={readDepartments}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Refresh Departments
        </button>
      </div>
    </div>
  );
}
