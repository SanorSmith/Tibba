'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function OpenEHRTestPage() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const testOpenEHRConnection = async () => {
    setLoading(true);
    try {
      // Test the OpenEHR API directly
      const response = await fetch('/api/tibbna-openehr-patients');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const patients = await response.json();
      const patientsArray = Array.isArray(patients) ? patients : (patients.data || []);
      
      setTestResults({
        success: true,
        totalPatients: patientsArray.length,
        samplePatients: patientsArray.slice(0, 3),
        rawResponse: patients
      });

      toast.success(`✅ Found ${patientsArray.length} OpenEHR patients`);
    } catch (error: any) {
      console.error('OpenEHR test error:', error);
      setTestResults({
        success: false,
        error: error.message,
        details: error
      });
      toast.error(`❌ OpenEHR test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testPatientBridgeSync = async () => {
    setLoading(true);
    try {
      // First get OpenEHR patients
      const openEHRResponse = await fetch('/api/tibbna-openehr-patients');
      const openEHRPatients = await openEHRResponse.json();
      const patientsArray = Array.isArray(openEHRPatients) ? openEHRPatients : (openEHRPatients.data || []);
      
      if (patientsArray.length === 0) {
        throw new Error('No OpenEHR patients found to sync');
      }

      // Now test the sync
      const { patientBridgeService } = await import('@/lib/patient-bridge-service');
      const synced = await patientBridgeService.syncMultiplePatients(patientsArray.slice(0, 3));
      
      setTestResults({
        success: true,
        syncTest: {
          openEHRPatientsFound: patientsArray.length,
          patientsToSync: Math.min(3, patientsArray.length),
          patientsSynced: synced.length,
          syncedPatients: synced
        }
      });

      toast.success(`✅ Synced ${synced.length} patients to bridge table`);
    } catch (error: any) {
      console.error('Sync test error:', error);
      setTestResults({
        success: false,
        error: error.message,
        details: error
      });
      toast.error(`❌ Sync test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">OpenEHR Connection Test</h1>
        <p className="text-gray-500 text-sm">Test the connection to Tibbna OpenEHR database</p>
      </div>

      {/* Test OpenEHR Connection */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test OpenEHR API</h2>
        <button
          onClick={testOpenEHRConnection}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test OpenEHR Connection'}
        </button>
        
        {testResults?.success && testResults.totalPatients !== undefined && (
          <div className="mt-4">
            <div className="p-3 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">{testResults.totalPatients}</div>
              <div className="text-sm text-green-500">OpenEHR Patients Found</div>
            </div>
            
            {testResults.samplePatients.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-sm mb-2">Sample OpenEHR Patients:</h3>
                <div className="space-y-2">
                  {testResults.samplePatients.map((patient: any, idx: number) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                      <div><strong>Patient ID:</strong> {patient.patientid || patient.id}</div>
                      <div><strong>Name:</strong> {patient.firstname || patient.first_name_ar} {patient.lastname || patient.last_name_ar}</div>
                      <div><strong>Phone:</strong> {patient.phone || 'N/A'}</div>
                      <div><strong>Email:</strong> {patient.email || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Patient Sync */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test Patient Sync to Bridge</h2>
        <button
          onClick={testPatientBridgeSync}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Patient Sync'}
        </button>
        
        {testResults?.syncTest && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{testResults.syncTest.openEHRPatientsFound}</div>
                <div className="text-sm text-blue-500">OpenEHR Patients</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{testResults.syncTest.patientsToSync}</div>
                <div className="text-sm text-green-500">Attempted to Sync</div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">{testResults.syncTest.patientsSynced}</div>
                <div className="text-sm text-purple-500">Successfully Synced</div>
              </div>
            </div>
            
            {testResults.syncTest.syncedPatients.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2">Synced Patients:</h3>
                <div className="space-y-2">
                  {testResults.syncTest.syncedPatients.map((patient: any) => (
                    <div key={patient.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div><strong>Name:</strong> {patient.patient_name_ar}</div>
                      <div><strong>OpenEHR ID:</strong> {patient.openehr_patient_id}</div>
                      <div><strong>Phone:</strong> {patient.phone}</div>
                      <div><strong>Created:</strong> {new Date(patient.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Display */}
      {testResults?.success === false && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-900 mb-2">Test Failed</h3>
          <div className="text-sm text-red-700">
            <div><strong>Error:</strong> {testResults.error}</div>
            {testResults.details && (
              <details className="mt-2">
                <summary className="cursor-pointer">Details</summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded">
                  {JSON.stringify(testResults.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
