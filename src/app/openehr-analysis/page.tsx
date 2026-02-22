'use client';

import { useState, useEffect } from 'react';

interface OpenEHRAnalysis {
  isOpenEHR: boolean;
  evidence: string[];
  tables: string[];
  ehrbaseIntegration: boolean;
}

interface AnalysisResponse {
  success: boolean;
  analysis: OpenEHRAnalysis;
  summary: {
    isOpenEHR: boolean;
    ehrbaseIntegration: boolean;
    evidenceCount: number;
    totalTables: number;
  };
}

export default function OpenEHRAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeDatabase = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/openehr-analysis');
      const result: AnalysisResponse = await response.json();
      
      if (result.success) {
        setAnalysis(result);
      } else {
        throw new Error(result.error || 'Failed to analyze OpenEHR structure');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    analyzeDatabase();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Analyzing OpenEHR Structure...</h1>
        <div className="animate-pulse">Checking for OpenEHR patterns in teammate's database...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Analysis Error</h1>
        <p className="text-red-500">{error}</p>
        <button 
          onClick={analyzeDatabase}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🏥 OpenEHR Structure Analysis</h1>
        <p className="text-gray-600">
          Analyzing your teammate's database for OpenEHR compliance and EHRbase integration
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${analysis.summary.isOpenEHR ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border`}>
          <h3 className="font-semibold mb-2">OpenEHR Structure</h3>
          <p className={`text-lg font-bold ${analysis.summary.isOpenEHR ? 'text-green-800' : 'text-yellow-800'}`}>
            {analysis.summary.isOpenEHR ? '✅ Yes' : '❌ No'}
          </p>
          <p className="text-sm text-gray-600">
            {analysis.summary.evidenceCount} evidence points found
          </p>
        </div>

        <div className={`p-4 rounded-lg ${analysis.summary.ehrbaseIntegration ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'} border`}>
          <h3 className="font-semibold mb-2">EHRbase Integration</h3>
          <p className={`text-lg font-bold ${analysis.summary.ehrbaseIntegration ? 'text-green-800' : 'text-gray-800'}`}>
            {analysis.summary.ehrbaseIntegration ? '✅ Yes' : '❌ No'}
          </p>
          <p className="text-sm text-gray-600">
            EHRbase connection detected
          </p>
        </div>

        <div className="p-4 rounded-lg bg-blue-50 border-blue-200 border">
          <h3 className="font-semibold mb-2">Database Size</h3>
          <p className="text-lg font-bold text-blue-800">
            {analysis.summary.totalTables} tables
          </p>
          <p className="text-sm text-gray-600">
            Total tables analyzed
          </p>
        </div>
      </div>

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evidence */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">🔍 Evidence Found</h2>
          {analysis.analysis.evidence.length > 0 ? (
            <div className="space-y-3">
              {analysis.analysis.evidence.map((evidence, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded border-l-4 border-blue-500">
                  <p className="text-sm">{evidence}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <p>No OpenEHR evidence found</p>
              <p className="text-sm">Database appears to use traditional structure</p>
            </div>
          )}
        </div>

        {/* Tables List */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📋 Database Tables</h2>
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              {analysis.analysis.tables.map((table, index) => (
                <div key={index} className="p-2 border rounded hover:bg-gray-50">
                  <span className="font-medium">{table}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">💡 Recommendations</h2>
        <div className="space-y-3">
          {analysis.summary.isOpenEHR ? (
            <>
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-800">
                  ✅ Database follows OpenEHR standards - good for interoperability
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-blue-800">
                  ℹ️ You can leverage OpenEHR archetypes and clinical models
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800">
                  ⚠️ Database uses traditional structure, not OpenEHR compliant
                </p>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-blue-800">
                  ℹ️ Consider OpenEHR migration for better clinical data interoperability
                </p>
              </div>
            </>
          )}
          
          {analysis.summary.ehrbaseIntegration && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-800">
                🏥 EHRbase integration detected - you can use OpenEHR REST API
              </p>
            </div>
          )}
        </div>
      </div>

      <button 
        onClick={analyzeDatabase}
        className="mt-6 px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Re-analyze Database
      </button>
    </div>
  );
}
