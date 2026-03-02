"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

interface SetupStatus {
  table_exists: boolean;
  staff_count: number;
}

export default function SetupStaffPage() {
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/setup-staff');
      const data = await response.json();

      if (response.ok) {
        setStatus(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to check staff table status');
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
      console.error('Status check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupStaffTable = async () => {
    try {
      setSettingUp(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/setup-staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        // Refresh status after successful setup
        setTimeout(() => {
          checkStatus();
        }, 1000);
      } else {
        setError(data.error || 'Failed to setup staff table');
      }
    } catch (error) {
      setError('Network error. Please check your connection.');
      console.error('Setup error:', error);
    } finally {
      setSettingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: '#618FF5' }} />
            <p style={{ color: '#a3a3a3', fontSize: '14px' }}>Checking staff table status...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/hr/employees" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
          <ArrowLeft className="mr-2" size={16} />
          Back to Employees
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Setup Staff Table</h1>
        <p className="text-gray-500">Create the staff table and insert sample data</p>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Database className="text-blue-600" size={24} />
          <h2 className="text-lg font-semibold text-gray-900">Database Status</h2>
        </div>

        {status && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Staff Table:</span>
              <div className="flex items-center gap-2">
                {status.table_exists ? (
                  <>
                    <CheckCircle className="text-green-500" size={16} />
                    <span className="text-sm text-green-600">Exists</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="text-red-500" size={16} />
                    <span className="text-sm text-red-600">Not Found</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Staff Records:</span>
              <span className="text-sm text-gray-600">{status.staff_count}</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-500" size={16} />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-green-500" size={16} />
            <p className="text-green-600">{success}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
        
        {!status?.table_exists ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              The staff table doesn't exist in the database. Click the button below to create it and insert sample data.
            </p>
            <button
              onClick={setupStaffTable}
              disabled={settingUp}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {settingUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Setting up...
                </>
              ) : (
                <>
                  <Database size={16} />
                  Create Staff Table
                </>
              )}
            </button>
          </div>
        ) : status?.staff_count === 0 ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              The staff table exists but contains no data. Click the button below to insert sample staff records.
            </p>
            <button
              onClick={setupStaffTable}
              disabled={settingUp}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {settingUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Inserting data...
                </>
              ) : (
                <>
                  <Database size={16} />
                  Insert Sample Data
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-green-600">
              ✅ Staff table is set up and contains {status.staff_count} staff records.
            </p>
            <Link href="/hr/employees">
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                <CheckCircle size={16} />
                View Staff Directory
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">What this does:</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li>• Creates the <code className="bg-gray-200 px-1 rounded">staff</code> table in the database</li>
          <li>• Inserts sample staff records for testing</li>
          <li>• Sets up proper database schema for employee management</li>
          <li>• Enables the employee list and add functionality</li>
        </ul>
      </div>
    </div>
  );
}
