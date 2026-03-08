'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Calendar, Clock, Users } from 'lucide-react';
import { toast } from 'sonner';
import ScheduleCalendar from '@/components/modules/hr/schedule-calendar';
import SearchableSelect from '@/components/ui/searchable-select';

export default function CreateSchedulePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    shift_id: '',
    effective_date: new Date().toISOString().split('T')[0],
    end_date: '',
    schedule_type: 'REGULAR',
    rotation_pattern: '',
    notes: '',
  });

  const [calendarSchedules, setCalendarSchedules] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load staff
      const staffResponse = await fetch('/api/hr/staff');
      const staffResult = await staffResponse.json();
      if (staffResult.success) {
        setEmployees(staffResult.data);
      }

      // Note: You'll need to create a shifts API endpoint or load from existing data
      // For now, using hardcoded shifts
      setShifts([
        { code: 'DAY', name: 'Day Shift', start_time: '08:00', end_time: '16:00' },
        { code: 'NIGHT', name: 'Night Shift', start_time: '20:00', end_time: '08:00' },
        { code: 'AFTERNOON', name: 'Afternoon Shift', start_time: '14:00', end_time: '22:00' },
      ]);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employee_id || !formData.shift_id || !formData.effective_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch('/api/hr/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          daily_details: calendarSchedules,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Schedule created successfully');
        router.push('/hr/schedules');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast.error('Failed to create schedule');
    } finally {
      setSubmitting(false);
    }
  };

  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: '#618FF5' }} />
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/schedules">
            <button className="btn-secondary p-2">
              <ArrowLeft size={16} />
            </button>
          </Link>
          <div>
            <h2 className="page-title">Create Employee Schedule</h2>
            <p className="page-description">Set up work schedule with hours, breaks, and lunch times</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Information */}
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Basic Information</h3>
          </div>
          <div className="tibbna-card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="tibbna-label">Employee *</label>
                <SearchableSelect
                  options={employees.map((emp, index) => ({
                    value: emp.staff_id,
                    label: `${emp.full_name} - ${emp.unit || 'No Unit'}`,
                    searchText: `${emp.staff_id} ${emp.full_name} ${emp.unit || ''}`,
                    key: `${emp.staff_id}-${index}`
                  }))}
                  value={formData.employee_id}
                  onChange={(value) => setFormData({ ...formData, employee_id: value })}
                  placeholder="Select Employee"
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="tibbna-label">Shift *</label>
                <SearchableSelect
                  options={shifts.map((shift) => ({
                    value: shift.code,
                    label: `${shift.name} (${shift.start_time} - ${shift.end_time})`,
                    searchText: `${shift.code} ${shift.name} ${shift.start_time} ${shift.end_time}`
                  }))}
                  value={formData.shift_id}
                  onChange={(value) => setFormData({ ...formData, shift_id: value })}
                  placeholder="Select Shift"
                  className="w-full"
                  required
                />
              </div>

              <div>
                <label className="tibbna-label">Effective Date *</label>
                <input
                  type="date"
                  className="tibbna-input"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="tibbna-label">End Date (Optional)</label>
                <input
                  type="date"
                  className="tibbna-input"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.effective_date}
                />
              </div>

              <div>
                <label className="tibbna-label">Schedule Type</label>
                <select
                  className="tibbna-input"
                  value={formData.schedule_type}
                  onChange={(e) => setFormData({ ...formData, schedule_type: e.target.value })}
                >
                  <option value="REGULAR">Regular</option>
                  <option value="TEMPORARY">Temporary</option>
                  <option value="OVERTIME">Overtime</option>
                  <option value="ROTATION">Rotation</option>
                </select>
              </div>

              <div>
                <label className="tibbna-label">Rotation Pattern (if applicable)</label>
                <input
                  type="text"
                  className="tibbna-input"
                  placeholder="e.g., 5-2 (5 days on, 2 days off)"
                  value={formData.rotation_pattern}
                  onChange={(e) => setFormData({ ...formData, rotation_pattern: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="tibbna-label">Notes</label>
              <textarea
                className="tibbna-input"
                rows={3}
                placeholder="Additional notes about this schedule..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Schedule Calendar */}
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Schedule Calendar</h3>
          </div>
          <div className="tibbna-card-content">
            <ScheduleCalendar 
              onScheduleChange={setCalendarSchedules}
              initialSchedules={calendarSchedules}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end tibbna-section">
          <Link href="/hr/schedules">
            <button type="button" className="btn-secondary">
              Cancel
            </button>
          </Link>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={submitting}>
            <Save size={16} />
            <span>{submitting ? 'Creating...' : 'Create Schedule'}</span>
          </button>
        </div>
      </form>
    </>
  );
}
