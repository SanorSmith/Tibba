'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, Users, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const statusColors: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#D1FAE5', text: '#065F46' },
  PENDING: { bg: '#FEF3C7', text: '#92400E' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
};

const scheduleTypeColors: Record<string, { bg: string; text: string }> = {
  REGULAR: { bg: '#DBEAFE', text: '#1E40AF' },
  TEMPORARY: { bg: '#FEF3C7', text: '#92400E' },
  OVERTIME: { bg: '#FCE7F3', text: '#9F1239' },
  ROTATION: { bg: '#E0E7FF', text: '#3730A3' },
};

export default function SchedulesPage() {
  const router = useRouter();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load schedules
      const schedResponse = await fetch('/api/hr/schedules');
      const schedResult = await schedResponse.json();
      if (schedResult.success) {
        setSchedules(schedResult.data);
      }

      // Load staff
      const staffResponse = await fetch('/api/hr/staff');
      const staffResult = await staffResponse.json();
      if (staffResult.success) {
        setEmployees(staffResult.data);
      }

      // Load shifts (from existing shifts table)
      // Note: You may need to create a shifts API endpoint
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`/api/hr/schedules?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Schedule deleted successfully');
        loadData();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error('Failed to delete schedule');
    }
  };

  const filteredSchedules = filterStatus === 'all' 
    ? schedules 
    : schedules.filter(s => s.status === filterStatus);

  const activeSchedules = schedules.filter(s => s.status === 'ACTIVE').length;
  const pendingSchedules = schedules.filter(s => s.status === 'PENDING').length;

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Employee Schedules</h2>
          <p className="page-description">{schedules.length} schedules configured</p>
        </div>
        <button
          onClick={() => router.push('/hr/schedules/create')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Create Schedule</span>
        </button>
      </div>

      {/* Stats */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Total Schedules</p>
                <p className="tibbna-card-value">{schedules.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                <Calendar size={20} style={{ color: '#3B82F6' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Active</p>
                <p className="tibbna-card-value" style={{ color: '#10B981' }}>{activeSchedules}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <CheckCircle size={20} style={{ color: '#10B981' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Pending</p>
                <p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{pendingSchedules}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <Clock size={20} style={{ color: '#F59E0B' }} />
              </div>
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">Employees</p>
                <p className="tibbna-card-value">{employees.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                <Users size={20} style={{ color: '#6366F1' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 tibbna-section flex-wrap" style={{ borderBottom: '1px solid #e4e4e4', paddingBottom: '12px' }}>
        {[
          { v: 'all', l: 'All' },
          { v: 'ACTIVE', l: 'Active' },
          { v: 'PENDING', l: 'Pending' },
          { v: 'CANCELLED', l: 'Cancelled' },
        ].map(f => (
          <button
            key={f.v}
            onClick={() => setFilterStatus(f.v)}
            className={`tibbna-tab ${filterStatus === f.v ? 'tibbna-tab-active' : ''}`}
          >
            {f.l}
          </button>
        ))}
      </div>

      {/* Schedules Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-content" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: '#a3a3a3' }}>Loading schedules...</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p style={{ color: '#a3a3a3' }}>No schedules found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tibbna-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Shift</th>
                    <th>Type</th>
                    <th>Effective Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.map(schedule => (
                    <tr 
                      key={schedule.id}
                      onClick={() => router.push(`/hr/schedules/${schedule.id}`)}
                      style={{ cursor: 'pointer' }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 500 }}>{schedule.employee_name}</p>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{schedule.department_name}</p>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 500 }}>{schedule.shift_name}</p>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>
                            {schedule.shift_start} - {schedule.shift_end}
                          </p>
                        </div>
                      </td>
                      <td>
                        <span
                          className="tibbna-badge"
                          style={{
                            backgroundColor: scheduleTypeColors[schedule.schedule_type]?.bg || '#F3F4F6',
                            color: scheduleTypeColors[schedule.schedule_type]?.text || '#374151',
                          }}
                        >
                          {schedule.schedule_type}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {new Date(schedule.effective_date).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {schedule.end_date ? new Date(schedule.end_date).toLocaleDateString() : 'Ongoing'}
                      </td>
                      <td>
                        <span
                          className="tibbna-badge"
                          style={{
                            backgroundColor: statusColors[schedule.status]?.bg || '#F3F4F6',
                            color: statusColors[schedule.status]?.text || '#374151',
                          }}
                        >
                          {schedule.status}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => router.push(`/hr/schedules/${schedule.id}`)}
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
                            <Edit size={14} />
                          </button>
                          <button
                            className="btn-secondary p-2"
                            onClick={() => handleDelete(schedule.id)}
                            title="Delete"
                            style={{ color: '#EF4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Info */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>Schedule Types</h3>
        </div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Regular Schedule</p>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>
                Standard work schedule with fixed hours and days
              </p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Rotation Schedule</p>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>
                Rotating shifts with predefined patterns
              </p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Temporary Schedule</p>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>
                Short-term schedule changes or assignments
              </p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>Overtime Schedule</p>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>
                Additional hours beyond regular schedule
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
