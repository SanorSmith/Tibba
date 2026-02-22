'use client';

import { useState } from 'react';

export default function TestPatientCreation() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('Testing connection to Tibbna OpenEHR DB...');
      
      const response = await fetch('/api/tibbna-openehr-patients?limit=5');
      const data = await response.json();
      
      if (response.ok) {
        setResult({ 
          success: true, 
          message: 'Connection successful!', 
          patients: data 
        });
        console.log('✅ Connection test passed:', data);
      } else {
        setError(`API Error: ${data.error || 'Unknown error'}`);
        console.error('❌ Connection test failed:', data);
      }
    } catch (err: any) {
      setError(`Network Error: ${err.message}`);
      console.error('❌ Network error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTestPatient = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    const testPatient = {
      firstname: 'Ahmed',
      lastname: 'Test',
      dateofbirth: '1990-01-01',
      gender: 'male',
      phone: '+964 770 123 4567',
      email: 'ahmed.test@example.com',
      address: 'Baghdad, Iraq',
      nationalid: 'TEST-001',
    };

    try {
      console.log('Creating test patient:', testPatient);
      
      const response = await fetch('/api/tibbna-openehr-patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPatient),
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({ 
          success: true, 
          message: 'Patient created successfully!', 
          patient: data 
        });
        console.log('✅ Patient created:', data);
      } else {
        setError(`API Error: ${data.error || 'Unknown error'}\n${data.details || ''}`);
        console.error('❌ Patient creation failed:', data);
      }
    } catch (err: any) {
      setError(`Network Error: ${err.message}`);
      console.error('❌ Network error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🏥 Tibbna OpenEHR DB - Patient Creation Test
        </h1>
        
        <p className="text-gray-600 mb-6">
          Test the connection and patient creation with your teammate's OpenEHR database.
        </p>

        <div className="space-y-4">
          {/* Test Connection Button */}
          <button
            onClick={testConnection}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg 
              hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors font-medium"
          >
            {loading ? 'Testing...' : '1. Test Database Connection'}
          </button>

          {/* Create Test Patient Button */}
          <button
            onClick={createTestPatient}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg 
              hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors font-medium"
          >
            {loading ? 'Creating...' : '2. Create Test Patient'}
          </button>
        </div>

        {/* Results Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-900 mb-2">❌ Error</h3>
            <pre className="text-sm text-red-700 whitespace-pre-wrap font-mono">
              {error}
            </pre>
          </div>
        )}

        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2">✅ Success</h3>
            <p className="text-green-700 mb-2">{result.message}</p>
            <pre className="text-sm text-green-800 whitespace-pre-wrap font-mono bg-green-100 p-3 rounded">
              {JSON.stringify(result.patient || result.patients, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions</h3>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Click "Test Database Connection" to verify the API works</li>
            <li>Check browser console (F12) for detailed logs</li>
            <li>If connection works, click "Create Test Patient"</li>
            <li>If you see errors, check the server console for details</li>
          </ol>
        </div>

        {/* Environment Check */}
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">🔧 Environment Check</h3>
          <p className="text-sm text-gray-700">
            Make sure your <code className="bg-gray-200 px-1 rounded">.env.local</code> has:
          </p>
          <pre className="text-xs text-gray-600 mt-2 bg-white p-2 rounded border">
TEAMMATE_DATABASE_URL=postgresql://neondb_owner:npg_...@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb
          </pre>
        </div>
      </div>
    </div>
  );
}
