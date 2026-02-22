'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { patientBridgeService } from '@/lib/patient-bridge-service';

export default function PatientBridgeTestPage() {
  const [loading, setLoading] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [syncedPatients, setSyncedPatients] = useState<any[]>([]);
  const [testResults, setTestResults] = useState<any>(null);

  const runMigration = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/migrate-patient-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      setMigrationStatus(result);

      if (result.success) {
        toast.success('✅ Migration completed successfully!');
      } else {
        toast.error(`❌ Migration failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error('Migration failed');
      setMigrationStatus({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testPatientSync = async () => {
    setLoading(true);
    try {
      // First, get some patients from OpenEHR
      const openEHRResponse = await fetch('/api/tibbna-openehr-patients');
      if (!openEHRResponse.ok) {
        throw new Error('Failed to fetch OpenEHR patients');
      }

      const openEHRPatients = await openEHRResponse.json();
      const patientsArray = Array.isArray(openEHRPatients) ? openEHRPatients : (openEHRPatients.data || []);
      
      // Take first 3 patients for testing
      const testPatients = patientsArray.slice(0, 3);
      
      // Sync them to bridge table
      const synced = await patientBridgeService.syncMultiplePatients(testPatients);
      setSyncedPatients(synced);

      toast.success(`✅ Synced ${synced.length} patients to bridge table`);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`❌ Sync failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testBridgeSearch = async () => {
    setLoading(true);
    try {
      const patients = await patientBridgeService.getAllPatients();
      const searchResults = await patientBridgeService.searchPatients('test');
      
      setTestResults({
        totalPatients: patients.length,
        searchResultCount: searchResults.length,
        patients: patients.slice(0, 3),
        searchResultsData: searchResults
      });

      toast.success(`✅ Found ${patients.length} patients in bridge table`);
    } catch (error: any) {
      console.error('Test error:', error);
      toast.error(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Bridge Test</h1>
        <p className="text-gray-500 text-sm">Test the hybrid database integration between OpenEHR and Supabase</p>
      </div>

      {/* Migration Status */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Database Migration</h2>
        <button
          onClick={runMigration}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Running...' : 'Run Migration'}
        </button>
        
        {migrationStatus && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50">
            <pre className="text-xs overflow-auto">
              {JSON.stringify(migrationStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Patient Sync Test */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Patient Sync Test</h2>
        <button
          onClick={testPatientSync}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Patient Sync'}
        </button>
        
        {syncedPatients.length > 0 && (
          <div className="mt-4">
            <h3 className="font-medium text-sm mb-2">Synced Patients:</h3>
            <div className="space-y-2">
              {syncedPatients.map((patient) => (
                <div key={patient.id} className="p-2 bg-gray-50 rounded text-xs">
                  <div><strong>Name:</strong> {patient.patient_name_ar}</div>
                  <div><strong>OpenEHR ID:</strong> {patient.openehr_patient_id}</div>
                  <div><strong>Phone:</strong> {patient.phone}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bridge Search Test */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Bridge Search Test</h2>
        <button
          onClick={testBridgeSearch}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Bridge Search'}
        </button>
        
        {testResults && (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{testResults.totalPatients}</div>
                <div className="text-sm text-blue-500">Total Patients</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{testResults.searchResultCount}</div>
                <div className="text-sm text-green-500">Search Results</div>
              </div>
            </div>
            
            <h3 className="font-medium text-sm mb-2">Sample Patients:</h3>
            <div className="space-y-2">
              {testResults.patients.map((patient: any) => (
                <div key={patient.id} className="p-2 bg-gray-50 rounded text-xs">
                  <div><strong>Name:</strong> {patient.patient_name_ar}</div>
                  <div><strong>OpenEHR ID:</strong> {patient.openehr_patient_id}</div>
                  <div><strong>Created:</strong> {new Date(patient.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
