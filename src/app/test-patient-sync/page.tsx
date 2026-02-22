'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { patientSyncService } from '@/lib/patient-sync-service';

export default function PatientSyncTestPage() {
  const [loading, setLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);

  const testPatientCopy = async () => {
    setLoading(true);
    try {
      // Get patients from OpenEHR
      const openEHRResponse = await fetch('/api/tibbna-openehr-patients');
      if (!openEHRResponse.ok) {
        throw new Error('Failed to fetch OpenEHR patients');
      }

      const openEHRPatients = await openEHRResponse.json();
      const patientsArray = Array.isArray(openEHRPatients) ? openEHRPatients : (openEHRPatients.data || []);
      
      // Copy first 3 patients to Supabase
      const copied = await patientSyncService.copyMultiplePatients(patientsArray.slice(0, 3));
      
      setSyncResults({
        openEHRPatientsFound: patientsArray.length,
        patientsToCopy: Math.min(3, patientsArray.length),
        patientsCopied: copied.length,
        copiedPatients: copied
      });

      toast.success(`✅ Copied ${copied.length} patients to Supabase`);
    } catch (error: any) {
      console.error('Copy test error:', error);
      setSyncResults({
        success: false,
        error: error.message
      });
      toast.error(`❌ Copy failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseSearch = async () => {
    setLoading(true);
    try {
      const patients = await patientSyncService.getAllPatients();
      const searchResults = await patientSyncService.searchPatients('sanor');
      
      setSearchResults({
        totalPatients: patients.length,
        searchResults: searchResults.length,
        allPatients: patients.slice(0, 3),
        searchMatches: searchResults
      });

      toast.success(`✅ Found ${patients.length} patients in Supabase`);
    } catch (error: any) {
      console.error('Search test error:', error);
      setSearchResults({
        success: false,
        error: error.message
      });
      toast.error(`❌ Search failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Patient Sync Test</h1>
        <p className="text-gray-500 text-sm">Copy patients from OpenEHR to Supabase database</p>
      </div>

      {/* Copy Patients Test */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Copy OpenEHR Patients to Supabase</h2>
        <button
          onClick={testPatientCopy}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Copying...' : 'Copy 3 Patients to Supabase'}
        </button>
        
        {syncResults && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{syncResults.openEHRPatientsFound}</div>
                <div className="text-sm text-blue-500">OpenEHR Patients</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{syncResults.patientsToCopy}</div>
                <div className="text-sm text-green-500">Attempted to Copy</div>
              </div>
              <div className="p-3 bg-purple-50 rounded">
                <div className="text-2xl font-bold text-purple-600">{syncResults.patientsCopied}</div>
                <div className="text-sm text-purple-500">Successfully Copied</div>
              </div>
            </div>
            
            {syncResults.copiedPatients && syncResults.copiedPatients.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2">Copied Patients in Supabase:</h3>
                <div className="space-y-2">
                  {syncResults.copiedPatients.map((patient: any) => (
                    <div key={patient.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div><strong>Supabase ID:</strong> {patient.patient_id}</div>
                      <div><strong>Name:</strong> {patient.full_name_ar}</div>
                      <div><strong>Phone:</strong> {patient.phone}</div>
                      <div><strong>OpenEHR Reference:</strong> {patient.openehr_patient_id}</div>
                      <div><strong>Created:</strong> {new Date(patient.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Test */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test Supabase Patient Search</h2>
        <button
          onClick={testSupabaseSearch}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Supabase Search'}
        </button>
        
        {searchResults && (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{searchResults.totalPatients}</div>
                <div className="text-sm text-blue-500">Total Patients in Supabase</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{searchResults.searchResults}</div>
                <div className="text-sm text-green-500">Search Results for "sanor"</div>
              </div>
            </div>
            
            {searchResults.allPatients && searchResults.allPatients.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2">Sample Patients in Supabase:</h3>
                <div className="space-y-2">
                  {searchResults.allPatients.map((patient: any) => (
                    <div key={patient.id} className="p-2 bg-gray-50 rounded text-xs">
                      <div><strong>ID:</strong> {patient.patient_id}</div>
                      <div><strong>Name:</strong> {patient.full_name_ar}</div>
                      <div><strong>Phone:</strong> {patient.phone}</div>
                      <div><strong>From OpenEHR:</strong> {patient.openehr_patient_id ? '✅ Yes' : '❌ No'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How This Works:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Fetches patients from Tibbna OpenEHR database</li>
          <li>Copies them to your Supabase patients table</li>
          <li>Keeps reference to original OpenEHR patient ID</li>
          <li>Finance system uses Supabase patients for all operations</li>
          <li>Original medical data stays in OpenEHR</li>
        </ol>
      </div>
    </div>
  );
}
