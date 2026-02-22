'use client';

import { useState, useEffect } from 'react';

export default function TestTeammateDB() {
  const [data, setData] = useState<{
    patients: any[];
    appointments: any[];
    staff: any[];
    workspaces: any[];
  }>({
    patients: [],
    appointments: [],
    staff: [],
    workspaces: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async (table: string) => {
    try {
      const response = await fetch(`/api/teammate-db?table=${table}&limit=10`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch data');
      }
    } catch (error: any) {
      console.error(`Error fetching ${table}:`, error);
      return [];
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [patients, appointments, staff, workspaces] = await Promise.all([
        fetchData('patients'),
        fetchData('appointments'),
        fetchData('staff'),
        fetchData('workspaces')
      ]);
      
      setData({
        patients: patients as any[],
        appointments: appointments as any[],
        staff: staff as any[],
        workspaces: workspaces as any[]
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Loading Teammate Database...</h1>
        <div className="animate-pulse">Fetching data from Neon database...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-600">Database Error</h1>
        <p className="text-red-500">{error}</p>
        <button 
          onClick={fetchAllData}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Teammate Database Access</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patients Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Patients ({data.patients.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.patients.map((patient: any, index) => (
              <div key={index} className="p-2 border rounded">
                <p className="font-medium">{patient.firstname} {patient.lastname}</p>
                <p className="text-sm text-gray-600">ID: {patient.patientid}</p>
                <p className="text-sm text-gray-600">Email: {patient.email}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Appointments ({data.appointments.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.appointments.map((apt: any, index) => (
              <div key={index} className="p-2 border rounded">
                <p className="font-medium">Appointment ID: {apt.appointmentid}</p>
                <p className="text-sm text-gray-600">Patient: {apt.patientname}</p>
                <p className="text-sm text-gray-600">Date: {new Date(apt.createdat).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Staff ({data.staff.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.staff.map((staff: any, index) => (
              <div key={index} className="p-2 border rounded">
                <p className="font-medium">{staff.firstname} {staff.lastname}</p>
                <p className="text-sm text-gray-600">Role: {staff.role}</p>
                <p className="text-sm text-gray-600">Unit: {staff.unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Workspaces Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Workspaces ({data.workspaces.length})</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.workspaces.map((ws: any, index) => (
              <div key={index} className="p-2 border rounded">
                <p className="font-medium">{ws.name}</p>
                <p className="text-sm text-gray-600">ID: {ws.workspaceid}</p>
                <p className="text-sm text-gray-600">Type: {ws.type}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button 
        onClick={fetchAllData}
        className="mt-6 px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
      >
        Refresh Data
      </button>
    </div>
  );
}
