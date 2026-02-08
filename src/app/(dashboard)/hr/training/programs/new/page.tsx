'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default function CreateTrainingProgramPage() {
  const [form, setForm] = useState({
    name: '', type: 'TECHNICAL', category: 'OPTIONAL', duration_hours: 8, cme_credits: 0,
    description: '', target_audience: [] as string[], prerequisites: '', is_active: true,
  });
  const [submitted, setSubmitted] = useState(false);

  const audiences = ['MEDICAL_STAFF', 'NURSING', 'ADMINISTRATIVE', 'TECHNICAL', 'SUPPORT'];

  const toggleAudience = (a: string) => {
    setForm(prev => ({
      ...prev,
      target_audience: prev.target_audience.includes(a)
        ? prev.target_audience.filter(x => x !== a)
        : [...prev.target_audience, a]
    }));
  };

  const handleSubmit = () => {
    if (!form.name || form.duration_hours <= 0) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <CheckCircle size={32} style={{ color: '#10B981' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Program Created Successfully</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>{form.name}</p>
        <div className="flex gap-2">
          <Link href="/hr/training"><button className="btn-secondary">Back to Training</button></Link>
          <button className="btn-primary" onClick={() => { setSubmitted(false); setForm({ name: '', type: 'TECHNICAL', category: 'OPTIONAL', duration_hours: 8, cme_credits: 0, description: '', target_audience: [], prerequisites: '', is_active: true }); }}>Create Another</button>
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
            <h2 className="page-title">Create Training Program</h2>
            <p className="page-description">Define a new training or certification program</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Program Details</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Program Name *</label>
                <input className="tibbna-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Advanced Cardiac Life Support (ACLS)" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Program Type *</label>
                  <select className="tibbna-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="ORIENTATION">Orientation</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="COMPLIANCE">Compliance</option>
                    <option value="MEDICAL_CME">Medical CME</option>
                    <option value="SAFETY">Safety</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Category *</label>
                  <select className="tibbna-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    <option value="MANDATORY">Mandatory</option>
                    <option value="OPTIONAL">Optional</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Duration (hours) *</label>
                  <input className="tibbna-input" type="number" min={1} value={form.duration_hours} onChange={e => setForm({ ...form, duration_hours: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>CME Credits</label>
                  <input className="tibbna-input" type="number" min={0} value={form.cme_credits} onChange={e => setForm({ ...form, cme_credits: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea className="tibbna-input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Program description..." />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '4px' }}>Prerequisites</label>
                <input className="tibbna-input" value={form.prerequisites} onChange={e => setForm({ ...form, prerequisites: e.target.value })} placeholder="e.g. BLS certification required" />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Target Audience</label>
                <div className="flex flex-wrap gap-2">
                  {audiences.map(a => (
                    <button key={a} onClick={() => toggleAudience(a)} style={{
                      padding: '4px 12px', fontSize: '12px', border: '1px solid #e4e4e4', cursor: 'pointer',
                      backgroundColor: form.target_audience.includes(a) ? '#618FF5' : '#fff',
                      color: form.target_audience.includes(a) ? '#fff' : '#525252',
                    }}>
                      {a.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid #e4e4e4', paddingTop: '16px' }}>
                <Link href="/hr/training"><button className="btn-secondary">Cancel</button></Link>
                <button className="btn-primary" onClick={handleSubmit} disabled={!form.name || form.duration_hours <= 0}>Create Program</button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="tibbna-card">
            <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Preview</h3></div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Name</span><span style={{ fontWeight: 500 }}>{form.name || '-'}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Type</span><span style={{ fontWeight: 500 }}>{form.type}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Category</span><span style={{ fontWeight: 500 }}>{form.category}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Duration</span><span style={{ fontWeight: 500 }}>{form.duration_hours}h</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>CME Credits</span><span style={{ fontWeight: 500 }}>{form.cme_credits}</span></div>
              <div className="flex justify-between"><span style={{ color: '#a3a3a3' }}>Audience</span><span style={{ fontWeight: 500 }}>{form.target_audience.length || 'All'}</span></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
