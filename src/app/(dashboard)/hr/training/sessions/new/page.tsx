'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import trainingData from '@/data/hr/training.json';
import employeesData from '@/data/hr/employees.json';

export default function CreateTrainingSessionPage() {
  const programs = trainingData.programs;
  const trainers = employeesData.employees.filter(e => ['G7', 'G8', 'G9', 'G10'].includes(e.grade_id) && e.employment_status === 'ACTIVE');

  const [form, setForm] = useState({
    program_id: programs[0]?.id || '', start_date: '', end_date: '', location: '',
    max_participants: 20, trainer_id: '', notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const selectedProgram = programs.find(p => p.id === form.program_id);

  const handleSubmit = () => {
    if (!form.program_id || !form.start_date || !form.end_date || !form.location) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <CheckCircle size={32} style={{ color: '#10B981' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Session Scheduled Successfully</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>{selectedProgram?.name} - {form.start_date}</p>
        <div className="flex gap-2">
          <Link href="/hr/training"><button className="btn-secondary">Back to Training</button></Link>
          <button className="btn-primary" onClick={() => { setSubmitted(false); setForm({ program_id: programs[0]?.id || '', start_date: '', end_date: '', location: '', max_participants: 20, trainer_id: '', notes: '' }); }}>Schedule Another</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/training"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Schedule Training Session</h2>
            <p className="page-description">Create a new training session for an existing program</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Session Details</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Training Program *</label>
                <select className="tibbna-input" value={form.program_id} onChange={e => setForm({ ...form, program_id: e.target.value })}>
                  {programs.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Start Date *</label>
                  <input className="tibbna-input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>End Date *</label>
                  <input className="tibbna-input" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Location *</label>
                  <select className="tibbna-input" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}>
                    <option value="">Select location...</option>
                    <option value="Training Room A">Training Room A</option>
                    <option value="Training Room B">Training Room B</option>
                    <option value="Conference Hall">Conference Hall</option>
                    <option value="Simulation Lab">Simulation Lab</option>
                    <option value="Online / Virtual">Online / Virtual</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Max Participants</label>
                  <input className="tibbna-input" type="number" min={1} max={100} value={form.max_participants} onChange={e => setForm({ ...form, max_participants: parseInt(e.target.value) || 20 })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Trainer / Instructor</label>
                <select className="tibbna-input" value={form.trainer_id} onChange={e => setForm({ ...form, trainer_id: e.target.value })}>
                  <option value="">Select trainer...</option>
                  {trainers.map(t => (<option key={t.id} value={t.id}>{t.first_name} {t.last_name} - {t.job_title}</option>))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Notes</label>
                <textarea className="tibbna-input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional session notes..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e4e4e4', paddingTop: '16px' }}>
                <Link href="/hr/training"><button className="btn-secondary">Cancel</button></Link>
                <button className="btn-primary" onClick={handleSubmit} disabled={!form.program_id || !form.start_date || !form.end_date || !form.location}>Schedule Session</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Program Info</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              {selectedProgram ? (
                <>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Program</span><span style={{ fontWeight: 500 }}>{selectedProgram.name}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Type</span><span style={{ fontWeight: 500 }}>{selectedProgram.type}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Category</span><span style={{ fontWeight: 500 }}>{selectedProgram.category}</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Duration</span><span style={{ fontWeight: 500 }}>{selectedProgram.duration_hours}h</span></div>
                  <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>CME Credits</span><span style={{ fontWeight: 500 }}>{selectedProgram.cme_credits || 0}</span></div>
                </>
              ) : (
                <p style={{ color: '#a3a3a3' }}>Select a program</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
