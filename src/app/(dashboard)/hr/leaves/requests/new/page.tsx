'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Save, AlertCircle } from 'lucide-react';
import type { LeaveRequestFormData } from '@/types/hr';
import { FormGroup, FormRow, FormActions, FormSection } from '@/components/modules/hr/shared/form-components';
import { ApprovalWorkflow } from '@/components/modules/hr/shared/approval-workflow';
import employeesData from '@/data/hr/employees.json';
import leavesData from '@/data/hr/leaves.json';

export default function NewLeaveRequestPage() {
  const [form, setForm] = useState<LeaveRequestFormData>({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    is_half_day: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const leaveTypes = leavesData.leave_types;

  const selectedEmployee = activeEmployees.find(e => e.id === form.employee_id);
  const selectedLeaveType = leaveTypes.find(lt => lt.id === form.leave_type_id);

  const employeeBalance = useMemo(() => {
    if (!form.employee_id || !form.leave_type_id) return null;
    const empBal = leavesData.leave_balances.find(b => b.employee_id === form.employee_id) as any;
    if (!empBal || !selectedLeaveType) return { available: selectedLeaveType?.max_days || 0, taken: 0, accrued: selectedLeaveType?.max_days || 0 };
    const codeMap: Record<string, string> = { 'LT-001': 'annual', 'LT-002': 'sick', 'LT-003': 'emergency' };
    const key = codeMap[form.leave_type_id];
    if (key && empBal[key]) {
      return { available: empBal[key].available, taken: empBal[key].used || empBal[key].taken || 0, accrued: empBal[key].total };
    }
    return { available: selectedLeaveType.max_days, taken: 0, accrued: selectedLeaveType.max_days };
  }, [form.employee_id, form.leave_type_id, selectedLeaveType]);

  const totalDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    if (form.is_half_day) return 0.5;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 5) days++;
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [form.start_date, form.end_date, form.is_half_day]);

  const update = (field: keyof LeaveRequestFormData, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.employee_id) e.employee_id = 'Select an employee';
    if (!form.leave_type_id) e.leave_type_id = 'Select leave type';
    if (!form.start_date) e.start_date = 'Start date is required';
    if (!form.end_date) e.end_date = 'End date is required';
    if (form.start_date && form.end_date && form.start_date > form.end_date) e.end_date = 'End date must be after start date';
    if (!form.reason.trim()) e.reason = 'Reason is required';
    if (employeeBalance && totalDays > (employeeBalance as any).available) {
      e.end_date = `Insufficient balance. Available: ${(employeeBalance as any).available} days`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePreview = () => {
    if (validate()) setShowPreview(true);
  };

  const handleSubmit = () => {
    const num = `LR-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setRequestNumber(num);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <Calendar size={32} style={{ color: '#065F46' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Leave Request Submitted</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>Request Number: <strong>{requestNumber}</strong></p>
        <p style={{ fontSize: '14px', color: '#525252' }}>
          {selectedEmployee?.first_name} {selectedEmployee?.last_name} — {selectedLeaveType?.name} — {totalDays} day(s)
        </p>
        <p style={{ fontSize: '13px', color: '#a3a3a3' }}>The request has been sent for approval.</p>
        <div className="flex gap-3 mt-4">
          <Link href="/hr/leaves"><button className="btn-secondary">Back to Leaves</button></Link>
          <button className="btn-primary" onClick={() => { setSubmitted(false); setShowPreview(false); setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '', is_half_day: false }); }}>
            New Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/leaves"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Submit Leave Request</h2>
            <p className="page-description">{showPreview ? 'Review and confirm' : 'Fill in leave details'}</p>
          </div>
        </div>
      </div>

      {!showPreview ? (
        <div className="tibbna-card">
          <div className="tibbna-card-content space-y-5">
            <FormSection title="Employee & Leave Type">
              <FormRow columns={2}>
                <FormGroup label="Employee" required error={errors.employee_id}>
                  <select className="tibbna-input" value={form.employee_id} onChange={e => update('employee_id', e.target.value)}>
                    <option value="">Select Employee</option>
                    {activeEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_number})</option>
                    ))}
                  </select>
                </FormGroup>
                <FormGroup label="Leave Type" required error={errors.leave_type_id}>
                  <select className="tibbna-input" value={form.leave_type_id} onChange={e => update('leave_type_id', e.target.value)}>
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map(lt => (
                      <option key={lt.id} value={lt.id}>{lt.name} ({lt.category} - max {lt.max_days} days)</option>
                    ))}
                  </select>
                </FormGroup>
              </FormRow>

              {employeeBalance && (
                <div style={{ padding: '12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={14} style={{ color: '#3B82F6' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D4ED8' }}>Leave Balance</span>
                  </div>
                  <div className="flex gap-6" style={{ fontSize: '13px' }}>
                    <span>Accrued: <strong>{(employeeBalance as any).accrued}</strong></span>
                    <span>Taken: <strong>{(employeeBalance as any).taken}</strong></span>
                    <span style={{ color: '#065F46' }}>Available: <strong>{(employeeBalance as any).available}</strong></span>
                  </div>
                </div>
              )}
            </FormSection>

            <FormSection title="Dates">
              <FormRow columns={3}>
                <FormGroup label="Start Date" required error={errors.start_date}>
                  <input className="tibbna-input" type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
                </FormGroup>
                <FormGroup label="End Date" required error={errors.end_date}>
                  <input className="tibbna-input" type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} min={form.start_date} />
                </FormGroup>
                <FormGroup label="Total Days">
                  <div className="tibbna-input flex items-center" style={{ backgroundColor: '#f9fafb', fontWeight: 600 }}>
                    {totalDays} day(s)
                  </div>
                </FormGroup>
              </FormRow>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="halfDay" checked={form.is_half_day} onChange={e => update('is_half_day', e.target.checked)} />
                <label htmlFor="halfDay" style={{ fontSize: '13px', color: '#525252' }}>Half-day leave</label>
              </div>
            </FormSection>

            <FormSection title="Details">
              <FormGroup label="Reason" required error={errors.reason}>
                <textarea
                  className="tibbna-input"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  value={form.reason}
                  onChange={e => update('reason', e.target.value)}
                  placeholder="Provide reason for leave request..."
                />
              </FormGroup>
              {selectedLeaveType && (selectedLeaveType as any).requires_doc && (
                <div style={{ padding: '8px 12px', backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', fontSize: '12px', color: '#92400E' }}>
                  This leave type requires supporting documentation (e.g., medical certificate).
                </div>
              )}
            </FormSection>

            <FormSection title="Approval Workflow">
              <ApprovalWorkflow steps={[
                { label: 'Submit', status: 'APPROVED', approver: 'Employee' },
                { label: 'Manager', status: 'NOT_STARTED', approver: 'Department Head' },
                { label: 'HR', status: 'NOT_STARTED', approver: 'HR Department' },
              ]} />
            </FormSection>

            <FormActions>
              <Link href="/hr/leaves"><button className="btn-secondary">Cancel</button></Link>
              <button className="btn-primary" onClick={handlePreview}>Preview Request</button>
            </FormActions>
          </div>
        </div>
      ) : (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Review Leave Request</h3>
          </div>
          <div className="tibbna-card-content space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ fontSize: '13px' }}>
              <div><span style={{ color: '#a3a3a3' }}>Employee</span><p style={{ fontWeight: 500 }}>{selectedEmployee?.first_name} {selectedEmployee?.last_name}</p></div>
              <div><span style={{ color: '#a3a3a3' }}>Department</span><p style={{ fontWeight: 500 }}>{selectedEmployee?.department_name}</p></div>
              <div><span style={{ color: '#a3a3a3' }}>Leave Type</span><p style={{ fontWeight: 500 }}>{selectedLeaveType?.name}</p></div>
              <div><span style={{ color: '#a3a3a3' }}>Start Date</span><p style={{ fontWeight: 500 }}>{form.start_date}</p></div>
              <div><span style={{ color: '#a3a3a3' }}>End Date</span><p style={{ fontWeight: 500 }}>{form.end_date}</p></div>
              <div><span style={{ color: '#a3a3a3' }}>Total Days</span><p style={{ fontWeight: 600, color: '#1D4ED8' }}>{totalDays}</p></div>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: '#a3a3a3' }}>Reason</span>
              <p style={{ fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>{form.reason}</p>
            </div>

            <FormActions>
              <button className="btn-secondary" onClick={() => setShowPreview(false)}>Back to Edit</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleSubmit}>
                <Save size={16} /> Submit Request
              </button>
            </FormActions>
          </div>
        </div>
      )}
    </>
  );
}
