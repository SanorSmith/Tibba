'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function TestLinkPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await fetch('/api/hr/schedules');
      const result = await response.json();
      if (result.success) {
        setSchedules(result.data);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const testScheduleId = schedules.length > 0 ? schedules[0].id : '1650cd78-22d8-4f2b-ac58-7bd148d6591c';
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Link Test Page</h1>
      
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading schedules...</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-semibold mb-2">Available Schedules:</h2>
              {schedules.length > 0 ? (
                <div className="space-y-2 mb-6">
                  {schedules.map((schedule, index) => (
                    <div key={schedule.id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="font-medium">{schedule.employee_name}</div>
                      <div className="text-sm text-gray-600">
                        {schedule.shift_name} • {schedule.department_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        ID: {schedule.id}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 mb-6">No schedules found</p>
              )}
            </div>
            
            <div>
              <h2 className="text-lg font-semibold mb-2">Test Different Link Styles:</h2>
              
              {/* Style 1: Basic Link */}
              <div className="mb-4">
                <Link href={`/hr/schedules/${testScheduleId}`} className="text-blue-600 underline">
                  Basic Link to Schedule Details
                </Link>
              </div>
          
          {/* Style 2: Button Link */}
          <div className="mb-4">
            <Link 
              href={`/hr/schedules/${testScheduleId}`}
              className="btn-primary"
            >
              Button Style Link
            </Link>
          </div>
          
          {/* Style 3: Icon Link (like in the table) */}
          <div className="mb-4">
            <Link 
              href={`/hr/schedules/${testScheduleId}`}
              className="btn-secondary p-2 inline-flex items-center justify-center hover:bg-gray-100 transition-colors"
              title="View Details"
              style={{ 
                textDecoration: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path>
              </svg>
            </Link>
          </div>
          
          {/* Style 4: Div with onClick */}
          <div className="mb-4">
            <div 
              onClick={() => window.location.href = `/hr/schedules/${testScheduleId}`}
              className="btn-secondary p-2 inline-flex cursor-pointer"
              style={{ cursor: 'pointer' }}
            >
              Div with onClick Handler
            </div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-semibold mb-2">Test Schedule ID:</h3>
          <code className="text-sm">{testScheduleId}</code>
          <p className="text-sm text-gray-600 mt-2">
            Try clicking each link to see which one works best.
          </p>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
