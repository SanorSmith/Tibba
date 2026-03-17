'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { toast } from 'sonner';

interface TestResult {
  test: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
}

export default function TestCrudPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([
    { test: 'Database Connection', status: 'pending' },
    { test: 'Table Exists', status: 'pending' },
    { test: 'Read Operation', status: 'pending' },
    { test: 'Create Operation', status: 'pending' },
    { test: 'Update Operation', status: 'pending' },
    { test: 'Delete Operation', status: 'pending' },
  ]);

  const runTests = async () => {
    setIsRunning(true);
    
    // Reset all tests to pending
    setResults(results.map(r => ({ ...r, status: 'pending' as const, message: undefined })));

    try {
      const response = await fetch('/api/test-crud');
      const data = await response.json();

      if (data.success) {
        // Update results based on the API response
        setResults([
          { test: 'Database Connection', status: data.results.database_connection ? 'success' : 'error', message: data.results.database_connection ? 'Connected to Neon database' : 'Failed to connect' },
          { test: 'Table Exists', status: data.results.table_exists ? 'success' : 'error', message: data.results.table_exists ? 'Departments table found' : 'Departments table not found' },
          { test: 'Read Operation', status: data.results.read_operation ? 'success' : 'error', message: data.results.read_operation ? `Found ${data.results.departments_count} departments` : 'Failed to read departments' },
          { test: 'Create Operation', status: data.results.create_operation ? 'success' : 'error', message: data.results.create_operation ? 'Successfully created test department' : 'Failed to create department' },
          { test: 'Update Operation', status: data.results.update_operation ? 'success' : 'error', message: data.results.update_operation ? 'Successfully updated test department' : 'Failed to update department' },
          { test: 'Delete Operation', status: data.results.delete_operation ? 'success' : 'error', message: data.results.delete_operation ? 'Successfully deleted test department' : 'Failed to delete department' },
        ]);
        
        toast.success('All CRUD tests completed!');
      } else {
        // Show errors
        setResults(results.map(r => ({ ...r, status: 'error' as const, message: 'Test failed' })));
        toast.error('CRUD tests failed');
      }
    } catch (error) {
      setResults(results.map(r => ({ ...r, status: 'error' as const, message: 'Test failed' })));
      toast.error('Failed to run tests');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      case 'running':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-50 border-gray-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/departments" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft size={16} className="mr-2" />
          Back to Departments
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Test CRUD Operations</h1>
        <p className="text-gray-500">Verify all department management operations are working correctly</p>
      </div>

      {/* Test Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">CRUD Operations Test</h2>
            <p className="text-sm text-gray-500 mt-1">
              Tests database connection, table existence, and all CRUD operations
            </p>
          </div>
          <button
            onClick={runTests}
            disabled={isRunning}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRunning ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Play size={16} />
            )}
            {isRunning ? 'Running Tests...' : 'Run Tests'}
          </button>
        </div>
      </div>

      {/* Test Results */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border ${getStatusColor(result.status)}`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                  <div>
                    <p className="font-medium text-gray-900">{result.test}</p>
                    {result.message && (
                      <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    )}
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {result.status === 'pending' && 'Pending'}
                  {result.status === 'running' && 'Running...'}
                  {result.status === 'success' && 'Passed'}
                  {result.status === 'error' && 'Failed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg border border-blue-100 p-6">
        <h3 className="font-semibold text-blue-900 mb-2">📋 What This Tests</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Database Connection</strong> - Verifies connection to Neon database</li>
          <li>• <strong>Table Exists</strong> - Checks if departments table exists</li>
          <li>• <strong>Read Operation</strong> - Tests fetching all departments</li>
          <li>• <strong>Create Operation</strong> - Creates a test department</li>
          <li>• <strong>Update Operation</strong> - Updates the test department</li>
          <li>• <strong>Delete Operation</strong> - Deletes the test department</li>
        </ul>
        <p className="text-sm text-blue-800 mt-3">
          <strong>Note:</strong> The test creates and deletes a temporary department to verify all operations work correctly.
        </p>
      </div>
    </div>
  );
}
