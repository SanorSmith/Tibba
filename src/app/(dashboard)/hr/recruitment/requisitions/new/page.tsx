'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Save, Send } from 'lucide-react';

const WS = 'cec4d702-6dae-4ea5-9a30-ef17842c00fd';

export default function NewRequisitionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form, setForm] = useState({
    positionTitle: '',
    departmentId: '',
    employmentType: 'FULL_TIME',
    numberOfPositions: '1',
    location: 'Baghdad',
    priority: 'NORMAL',
    salaryMin: '',
    salaryMax: '',
    requiredByDate: '',
    businessJustification: '',
    jobDescription: '',
    keyResponsibilities: '',
    requiredQualifications: '',
    preferredQualifications: '',
  });

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      const data = await res.json();
      if (data.success) setDepartments(data.data || []);
    } catch { /* ignore */ }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (submit: boolean) => {
    if (!form.positionTitle) {
      toast.error('Position title is required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/recruitment/requisitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, workspaceId: WS }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error); setSaving(false); return; }

      const reqId = data.data.requisition_id;

      if (submit) {
        const submitRes = await fetch(`/api/recruitment/requisitions/${reqId}/submit`, { method: 'POST' });
        const submitData = await submitRes.json();
        if (submitData.success) {
          toast.success('Requisition submitted for approval');
        } else {
          toast.error(submitData.error || 'Submit failed');
        }
      } else {
        toast.success('Requisition saved as draft');
      }

      router.push(`/hr/recruitment/requisitions/${reqId}`);
    } catch (error) {
      toast.error('Failed to create requisition');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-secondary" style={{ padding: '8px' }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="page-title">New Job Requisition</h2>
            <p className="page-description">Request approval to hire new staff</p>
          </div>
        </div>
      </div>

      {/* Position Information */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Position Information</h3></div>
        <div className="tibbna-card-content space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="tibbna-label">Position Title *</label>
              <input name="positionTitle" value={form.positionTitle} onChange={handleChange} className="tibbna-input" placeholder="e.g., Senior Nurse - ICU" />
            </div>
            <div>
              <label className="tibbna-label">Department</label>
              <select name="departmentId" value={form.departmentId} onChange={handleChange} className="tibbna-input">
                <option value="">Select department</option>
                {departments.map((d: any) => (
                  <option key={d.departmentid || d.id} value={d.departmentid || d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="tibbna-label">Number of Positions *</label>
              <input name="numberOfPositions" type="number" min="1" value={form.numberOfPositions} onChange={handleChange} className="tibbna-input" />
            </div>
            <div>
              <label className="tibbna-label">Employment Type</label>
              <select name="employmentType" value={form.employmentType} onChange={handleChange} className="tibbna-input">
                <option value="FULL_TIME">Full-Time</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="TEMPORARY">Temporary</option>
              </select>
            </div>
            <div>
              <label className="tibbna-label">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="tibbna-input">
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="tibbna-label">Location</label>
              <input name="location" value={form.location} onChange={handleChange} className="tibbna-input" />
            </div>
            <div>
              <label className="tibbna-label">Required By Date</label>
              <input name="requiredByDate" type="date" value={form.requiredByDate} onChange={handleChange} className="tibbna-input" />
            </div>
          </div>
          <div>
            <label className="tibbna-label">Business Justification *</label>
            <textarea name="businessJustification" rows={3} value={form.businessJustification} onChange={handleChange} className="tibbna-input" placeholder="Explain why this position is needed..." style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="tibbna-label">Job Description</label>
            <textarea name="jobDescription" rows={3} value={form.jobDescription} onChange={handleChange} className="tibbna-input" placeholder="Describe the role..." style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* Budget */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Budget Information</h3></div>
        <div className="tibbna-card-content">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="tibbna-label">Salary Range Min (IQD)</label>
              <input name="salaryMin" type="number" value={form.salaryMin} onChange={handleChange} className="tibbna-input" placeholder="e.g., 1500000" />
            </div>
            <div>
              <label className="tibbna-label">Salary Range Max (IQD)</label>
              <input name="salaryMax" type="number" value={form.salaryMax} onChange={handleChange} className="tibbna-input" placeholder="e.g., 2000000" />
            </div>
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Requirements</h3></div>
        <div className="tibbna-card-content space-y-4">
          <div>
            <label className="tibbna-label">Key Responsibilities</label>
            <textarea name="keyResponsibilities" rows={3} value={form.keyResponsibilities} onChange={handleChange} className="tibbna-input" placeholder="List main responsibilities..." style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="tibbna-label">Required Qualifications</label>
            <textarea name="requiredQualifications" rows={3} value={form.requiredQualifications} onChange={handleChange} className="tibbna-input" placeholder="Education, certifications..." style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="tibbna-label">Preferred Qualifications</label>
            <textarea name="preferredQualifications" rows={3} value={form.preferredQualifications} onChange={handleChange} className="tibbna-input" placeholder="Nice-to-have skills..." style={{ resize: 'vertical' }} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 tibbna-section" style={{ paddingBottom: 32 }}>
        <button onClick={() => router.back()} className="btn-secondary" disabled={saving}>Cancel</button>
        <button onClick={() => handleSubmit(false)} className="btn-secondary flex items-center gap-2" disabled={saving}>
          <Save size={16} /> Save Draft
        </button>
        <button onClick={() => handleSubmit(true)} className="btn-primary flex items-center gap-2" disabled={saving}>
          <Send size={16} /> Submit for Approval
        </button>
      </div>
    </>
  );
}
