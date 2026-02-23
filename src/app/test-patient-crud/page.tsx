'use client';

import { useEffect, useState } from 'react';
import { Database, Plus, Edit, Trash2, Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface TestPatient {
  patientid?: string;
  firstname?: string;
  lastname?: string;
  dateofbirth?: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  nationalid?: string;
  medicalhistory?: string;
  workspaceid?: string;
  ehrid?: string;
}

interface TestResult {
  operation: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  data?: any;
  error?: string;
}

export default function TestPatientCRUDPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [testPatient, setTestPatient] = useState<TestPatient | null>(null);

  useEffect(() => {
    runFullCRUDTest();
  }, []);

  const addTestResult = (operation: string, status: 'success' | 'error' | 'pending', message: string, data?: any, error?: string) => {
    setTestResults(prev => [...prev, { operation, status, message, data, error }]);
  };

  const runFullCRUDTest = async () => {
    setLoading(true);
    setTestResults([]);
    
    // Test 1: GET all patients
    addTestResult('GET All Patients', 'pending', 'Fetching all patients from OpenEHR database...');
    try {
      const res = await fetch('/api/tibbna-openehr-patients');
      if (res.ok) {
        const patients = await res.json();
        addTestResult('GET All Patients', 'success', `Successfully fetched ${Array.isArray(patients) ? patients.length : 0} patients from OpenEHR Neon database`, patients);
      } else {
        const error = await res.json();
        addTestResult('GET All Patients', 'error', 'Failed to fetch patients', null, error.error);
      }
    } catch (error: any) {
      addTestResult('GET All Patients', 'error', 'Network error', null, error.message);
    }

    // Test 2: CREATE a new patient
    addTestResult('CREATE Patient', 'pending', 'Creating a new test patient in OpenEHR database...');
    const newPatient = {
      first_name_ar: 'Test',
      last_name_ar: 'Patient',
      date_of_birth: '1990-01-01',
      gender: 'MALE',
      phone: '07900000000',
      email: 'test@openehr.com',
      governorate: 'Baghdad',
      national_id: 'TEST123456',
      medical_history: 'Test patient for CRUD verification'
    };

    try {
      const res = await fetch('/api/tibbna-openehr-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      });
      
      if (res.ok) {
        const createdPatient = await res.json();
        setTestPatient(createdPatient);
        addTestResult('CREATE Patient', 'success', `Successfully created patient ${createdPatient.patientid} in OpenEHR Neon database`, createdPatient);
      } else {
        const error = await res.json();
        addTestResult('CREATE Patient', 'error', 'Failed to create patient', null, error.error);
      }
    } catch (error: any) {
      addTestResult('CREATE Patient', 'error', 'Network error', null, error.message);
    }

    // Test 3: UPDATE the created patient
    if (testPatient) {
      addTestResult('UPDATE Patient', 'pending', 'Updating the test patient in OpenEHR database...');
      const updatedData = {
        ...newPatient,
        first_name_ar: 'Updated Test',
        phone: '07911111111'
      };

      try {
        const res = await fetch('/api/tibbna-openehr-patients', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...updatedData, patient_id: testPatient.patientid }),
        });
        
        if (res.ok) {
          const updatedPatient = await res.json();
          addTestResult('UPDATE Patient', 'success', `Successfully updated patient ${updatedPatient.patientid} in OpenEHR Neon database`, updatedPatient);
        } else {
          const error = await res.json();
          addTestResult('UPDATE Patient', 'error', 'Failed to update patient', null, error.error);
        }
      } catch (error: any) {
        addTestResult('UPDATE Patient', 'error', 'Network error', null, error.message);
      }
    }

    // Test 4: GET specific patient
    if (testPatient) {
      addTestResult('GET Specific Patient', 'pending', `Fetching patient ${testPatient.patientid} from OpenEHR database...`);
      try {
        const res = await fetch(`/api/tibbna-openehr-patients?id=${testPatient.patientid}`);
        if (res.ok) {
          const patient = await res.json();
          addTestResult('GET Specific Patient', 'success', `Successfully fetched patient ${patient.patientid} from OpenEHR Neon database`, patient);
        } else {
          const error = await res.json();
          addTestResult('GET Specific Patient', 'error', 'Failed to fetch specific patient', null, error.error);
        }
      } catch (error: any) {
        addTestResult('GET Specific Patient', 'error', 'Network error', null, error.message);
      }
    }

    // Test 5: DELETE the test patient
    if (testPatient) {
      addTestResult('DELETE Patient', 'pending', `Deleting patient ${testPatient.patientid} from OpenEHR database...`);
      try {
        const res = await fetch(`/api/tibbna-openehr-patients?id=${testPatient.patientid}`, {
          method: 'DELETE',
        });
        
        if (res.ok) {
          const result = await res.json();
          addTestResult('DELETE Patient', 'success', `Successfully deleted patient ${testPatient.patientid} from OpenEHR Neon database`, result);
        } else {
          const error = await res.json();
          addTestResult('DELETE Patient', 'error', 'Failed to delete patient', null, error.error);
        }
      } catch (error: any) {
        addTestResult('DELETE Patient', 'error', 'Network error', null, error.message);
      }
    }

    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'pending':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Patient CRUD Test - OpenEHR Neon Database</h1>
        </div>
        <button
          onClick={runFullCRUDTest}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Run Tests
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Database Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Database:</span> OpenEHR (Neon PostgreSQL)
          </div>
          <div>
            <span className="font-medium">Environment:</span> {process.env.NODE_ENV}
          </div>
          <div>
            <span className="font-medium">API Endpoint:</span> /api/tibbna-openehr-patients
          </div>
          <div>
            <span className="font-medium">Connection:</span> {process.env.OPENEHR_DATABASE_URL ? '✅ Configured' : '❌ Not configured'}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">CRUD Operations Test Results</h2>
        
        {testResults.map((result, index) => (
          <div key={index} className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}>
            <div className="flex items-start gap-3">
              {getStatusIcon(result.status)}
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{result.operation}</h3>
                <p className="text-sm mb-2">{result.message}</p>
                
                {result.data && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium">View Response Data</summary>
                    <pre className="mt-2 p-2 bg-black bg-opacity-10 rounded text-xs overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
                
                {result.error && (
                  <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {testResults.length === 0 && !loading && (
        <div className="text-center py-12 text-gray-500">
          <Database size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Click "Run Tests" to verify patient CRUD operations on OpenEHR Neon database</p>
        </div>
      )}

      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold mb-2">What This Tests:</h3>
        <ul className="text-sm space-y-1 text-gray-600">
          <li>✅ All patient operations use OpenEHR Neon database (not local)</li>
          <li>✅ CREATE: Adds patient to OpenEHR patients table</li>
          <li>✅ READ: Fetches patients from OpenEHR patients table</li>
          <li>✅ UPDATE: Modifies patient records in OpenEHR database</li>
          <li>✅ DELETE: Removes patient records from OpenEHR database</li>
          <li>✅ Connection: Verifies Neon PostgreSQL connectivity</li>
        </ul>
      </div>
    </div>
  );
}
