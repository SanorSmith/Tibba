'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, X } from 'lucide-react';

export const dynamic = 'force-dynamic';


function ScheduleInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId') || '';
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [panelMembers, setPanelMembers] = useState<string[]>([]);
  const [form, setForm] = useState({
    applicationId,
    interviewType: 'TECHNICAL',
    interviewRound: '1',
    scheduledDate: '',
    scheduledStartTime: '09:00',
    durationMinutes: '60',
    location: '',
    meetingLink: '',
    notes: '',
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/hr/employees');
      const data = await res.json();
      if (data.success) setEmployees(data.data || []);
    } catch { /* ignore */ }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addPanel = (empId: string) => {
    if (empId && !panelMembers.includes(empId)) setPanelMembers([...panelMembers, empId]);
  };
  const removePanel = (empId: string) => {
    setPanelMembers(panelMembers.filter(id => id !== empId));
  };

  const handleSubmit = async () => {
    if (!form.applicationId || !form.scheduledDate) {
      toast.error('Application ID and date are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/recruitment/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: form.applicationId,
          interviewType: form.interviewType,
          interviewRound: parseInt(form.interviewRound),
          scheduledDate: form.scheduledDate,
          scheduledStartTime: form.scheduledStartTime,
          durationMinutes: parseInt(form.durationMinutes),
          location: form.location || null,
          meetingLink: form.meetingLink || null,
          notes: form.notes || null,
          panelMembers,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Interview scheduled!');
        router.push('/hr/recruitment/interviews');
      } else toast.error(data.error);
    } catch { toast.error('Failed to schedule'); }
    finally { setSaving(false); }
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-secondary" style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="page-title">Schedule Interview</h2>
            <p className="page-description">Set up interview details and panel</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Interview Details</h3></div>
        <div className="tibbna-card-content space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="tibbna-label">Application ID *</label>
              <input name="applicationId" value={form.applicationId} onChange={handleChange} className="tibbna-input" placeholder="Application ID" />
            </div>
            <div>
              <label className="tibbna-label">Interview Type *</label>
              <select name="interviewType" value={form.interviewType} onChange={handleChange} className="tibbna-input">
                <option value="PHONE_SCREEN">Phone Screen</option>
                <option value="VIDEO">Video Interview</option>
                <option value="IN_PERSON">In-Person</option>
                <option value="TECHNICAL">Technical</option>
                <option value="BEHAVIORAL">Behavioral</option>
                <option value="PANEL">Panel Interview</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="tibbna-label">Date *</label>
              <input name="scheduledDate" type="date" value={form.scheduledDate} onChange={handleChange} className="tibbna-input" />
            </div>
            <div>
              <label className="tibbna-label">Start Time *</label>
              <input name="scheduledStartTime" type="time" value={form.scheduledStartTime} onChange={handleChange} className="tibbna-input" />
            </div>
            <div>
              <label className="tibbna-label">Duration (mins) *</label>
              <input name="durationMinutes" type="number" value={form.durationMinutes} onChange={handleChange} className="tibbna-input" />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="tibbna-label">Location</label>
              <input name="location" value={form.location} onChange={handleChange} className="tibbna-input" placeholder="Room 301 / Virtual" />
            </div>
            <div>
              <label className="tibbna-label">Meeting Link</label>
              <input name="meetingLink" value={form.meetingLink} onChange={handleChange} className="tibbna-input" placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <div>
            <label className="tibbna-label">Round</label>
            <input name="interviewRound" type="number" min="1" value={form.interviewRound} onChange={handleChange} className="tibbna-input" style={{ maxWidth: 120 }} />
          </div>
          <div>
            <label className="tibbna-label">Notes</label>
            <textarea name="notes" rows={3} value={form.notes} onChange={handleChange} className="tibbna-input" placeholder="Interview notes..." style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* Panel */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Interview Panel</h3></div>
        <div className="tibbna-card-content space-y-3">
          <div>
            <label className="tibbna-label">Add Panel Member</label>
            <select onChange={(e) => { addPanel(e.target.value); e.target.value = ''; }} className="tibbna-input">
              <option value="">Select employee...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} - {emp.job_title || ''}</option>
              ))}
            </select>
          </div>
          {panelMembers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {panelMembers.map(id => {
                const emp = employees.find(e => e.id === id);
                return (
                  <span key={id} className="tibbna-badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {emp ? `${emp.first_name} ${emp.last_name}` : id}
                    <button onClick={() => removePanel(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      <X size={12} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 tibbna-section" style={{ paddingBottom: 32 }}>
        <button onClick={() => router.back()} className="btn-secondary" disabled={saving}>Cancel</button>
        <button onClick={handleSubmit} className="btn-primary flex items-center gap-2" disabled={saving}>
          <Calendar size={16} /> Schedule Interview
        </button>
      </div>
    </>
  );
}

export default function ScheduleInterviewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ScheduleInterviewContent />
    </Suspense>
  );
}
