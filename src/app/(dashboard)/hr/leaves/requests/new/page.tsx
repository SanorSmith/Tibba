'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Save, AlertCircle, Upload, FileText, Clock, Users } from 'lucide-react';
import type { LeaveRequest } from '@/types/hr';
import { FormGroup, FormRow, FormActions, FormSection } from '@/components/modules/hr/shared/form-components';
import { ApprovalWorkflow } from '@/components/modules/hr/shared/approval-workflow';
import { dataStore } from '@/lib/dataStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import leavesData from '@/data/hr/leaves.json';

// Map leave_type_id → balance key used in the nested JSON structure
const BALANCE_KEY_MAP: Record<string, string> = {
  'LT-001': 'annual',
  'LT-002': 'sick',
  'LT-003': 'emergency',
  'LT-004': 'maternity',
  'LT-005': 'paternity',
  'LT-006': 'unpaid',
  'LT-007': 'hajj',
  'LT-008': 'study',
};

export default function NewLeaveRequestPage() {
  const { user } = useAuth();

  // Form state
  const [form, setForm] = useState({
    employee_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    is_half_day: false,
    contact_number: '',
    supporting_document: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);

  // Data
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    const emps = dataStore.getEmployees();
    setEmployees(emps.filter((e: any) => e.employment_status === 'ACTIVE'));
  }, []);

  const leaveTypes = leavesData.leave_types;

  const selectedEmployee = employees.find(e => e.id === form.employee_id);
  const selectedLeaveType = leaveTypes.find(lt => lt.id === form.leave_type_id);

  // =========================================================================
  // LEAVE BALANCE (nested structure: annual/sick/emergency)
  // =========================================================================

  const employeeBalance = useMemo(() => {
    if (!form.employee_id || !form.leave_type_id) return null;
    const rawBal = dataStore.getRawLeaveBalance(form.employee_id);
    if (!rawBal || !selectedLeaveType) {
      return { available: selectedLeaveType?.max_days || 0, taken: 0, total: selectedLeaveType?.max_days || 0 };
    }
    const key = BALANCE_KEY_MAP[form.leave_type_id];
    if (key && rawBal[key]) {
      return {
        available: rawBal[key].available ?? 0,
        taken: rawBal[key].used ?? rawBal[key].taken ?? 0,
        pending: rawBal[key].pending ?? 0,
        total: rawBal[key].total ?? selectedLeaveType.max_days,
      };
    }
    // No balance record for this type → use max_days as entitlement
    return { available: selectedLeaveType.max_days, taken: 0, total: selectedLeaveType.max_days };
  }, [form.employee_id, form.leave_type_id, selectedLeaveType]);

  // All balances for sidebar
  const allBalances = useMemo(() => {
    if (!form.employee_id) return [];
    const rawBal = dataStore.getRawLeaveBalance(form.employee_id);
    if (!rawBal) return [];
    return leaveTypes.map(lt => {
      const key = BALANCE_KEY_MAP[lt.id];
      const b = key ? rawBal[key] : null;
      return {
        name: lt.name,
        code: lt.code,
        color: lt.color,
        available: b?.available ?? lt.max_days,
        total: b?.total ?? lt.max_days,
        taken: b?.used ?? b?.taken ?? 0,
        pending: b?.pending ?? 0,
        isSelected: lt.id === form.leave_type_id,
      };
    });
  }, [form.employee_id, form.leave_type_id, leaveTypes]);

  // =========================================================================
  // WORKING DAYS CALCULATION (excludes Fri + Sat for Iraq)
  // =========================================================================

  const workingDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    if (form.is_half_day) return 0.5;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const dow = cur.getDay();
      if (dow !== 5 && dow !== 6) days++; // Exclude Friday & Saturday (Iraqi weekend)
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [form.start_date, form.end_date, form.is_half_day]);

  const totalCalendarDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const diff = new Date(form.end_date).getTime() - new Date(form.start_date).getTime();
    return Math.max(1, Math.ceil(diff / 86400000) + 1);
  }, [form.start_date, form.end_date]);

  const exceedsBalance = employeeBalance ? workingDays > employeeBalance.available : false;

  // =========================================================================
  // FORM HELPERS
  // =========================================================================

  const update = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.employee_id) e.employee_id = 'Select an employee';
    if (!form.leave_type_id) e.leave_type_id = 'Select leave type';
    if (!form.start_date) e.start_date = 'Start date is required';
    if (!form.end_date) e.end_date = 'End date is required';
    if (form.start_date && form.end_date && form.start_date > form.end_date) e.end_date = 'End date must be after start date';
    if (!form.reason.trim()) e.reason = 'Reason is required';
    if (workingDays === 0 && !form.is_half_day) e.end_date = 'Must include at least one working day';
    if (exceedsBalance && BALANCE_KEY_MAP[form.leave_type_id] !== 'unpaid') {
      e.end_date = `Insufficient balance. Available: ${employeeBalance?.available ?? 0} days`;
    }
    if (selectedLeaveType?.requires_doc && !docFile && !form.supporting_document) {
      e.supporting_document = `${selectedLeaveType.name} requires supporting documentation`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePreview = () => { if (validate()) setShowPreview(true); };

  // =========================================================================
  // SUBMIT — persist to dataStore
  // =========================================================================

  const handleSubmit = () => {
    if (!validate()) return;
    setSubmitting(true);

    try {
      const emp = selectedEmployee;
      const num = `LR-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;

      const request: LeaveRequest = {
        id: `LR-${Date.now()}`,
        request_number: num,
        employee_id: form.employee_id,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '',
        department: emp?.department_name,
        leave_type: selectedLeaveType?.name || '',
        leave_type_id: form.leave_type_id,
        start_date: form.start_date,
        end_date: form.end_date,
        total_days: workingDays,
        reason: form.reason.trim(),
        status: 'PENDING_APPROVAL',
        submitted_at: new Date().toISOString().split('T')[0],
        is_half_day: form.is_half_day,
        supporting_document: docFile ? docFile.name : undefined,
        approver_1_status: 'PENDING',
        approver_2_status: 'PENDING',
      };

      const ok = dataStore.addLeaveRequest(request);
      if (!ok) { toast.error('Failed to save leave request'); setSubmitting(false); return; }

      // Update leave balance — increase pending, decrease available
      const balKey = BALANCE_KEY_MAP[form.leave_type_id];
      if (balKey && employeeBalance) {
        dataStore.updateLeaveBalanceByType(form.employee_id, balKey, {
          pending: (employeeBalance.pending ?? 0) + workingDays,
          available: Math.max(0, employeeBalance.available - workingDays),
        });
      }

      setRequestNumber(num);
      setSubmitted(true);
      toast.success('Leave request submitted successfully!');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('Error submitting request');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // RENDER — Success
  // =========================================================================

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <Calendar size={32} style={{ color: '#065F46' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Leave Request Submitted</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>Request Number: <strong>{requestNumber}</strong></p>
        <p style={{ fontSize: '14px', color: '#525252' }}>
          {selectedEmployee?.first_name} {selectedEmployee?.last_name} — {selectedLeaveType?.name} — {workingDays} working day(s)
        </p>
        <p style={{ fontSize: '13px', color: '#a3a3a3' }}>The request has been sent for multi-level approval (Iraqi Req #22).</p>
        <div className="flex gap-3 mt-4">
          <Link href="/hr/leaves"><button className="btn-secondary">Back to Leaves</button></Link>
          <Link href="/hr/leaves/requests"><button className="btn-secondary">View Requests</button></Link>
          <button className="btn-primary" onClick={() => {
            setSubmitted(false); setShowPreview(false); setDocFile(null);
            setForm({ employee_id: '', leave_type_id: '', start_date: '', end_date: '', reason: '', is_half_day: false, contact_number: '', supporting_document: '' });
          }}>
            New Request
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER — Form
  // =========================================================================

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/leaves"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Submit Leave Request</h2>
            <p className="page-description">{showPreview ? 'Review and confirm your request' : 'Fill in leave details'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 tibbna-section">
        {/* ============================================================ */}
        {/* LEFT: Form / Preview                                         */}
        {/* ============================================================ */}
        <div className="lg:col-span-2">
          {!showPreview ? (
            <div className="tibbna-card">
              <div className="tibbna-card-content space-y-5">
                {/* Employee & Leave Type */}
                <FormSection title="Employee & Leave Type">
                  <FormRow columns={2}>
                    <FormGroup label="Employee" required error={errors.employee_id}>
                      <select className="tibbna-input" value={form.employee_id} onChange={e => update('employee_id', e.target.value)}>
                        <option value="">Select Employee</option>
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_number})</option>
                        ))}
                      </select>
                    </FormGroup>
                    <FormGroup label="Leave Type" required error={errors.leave_type_id}>
                      <select className="tibbna-input" value={form.leave_type_id} onChange={e => update('leave_type_id', e.target.value)}>
                        <option value="">Select Leave Type</option>
                        {leaveTypes.map(lt => (
                          <option key={lt.id} value={lt.id}>{lt.name} ({lt.category} — max {lt.max_days} days)</option>
                        ))}
                      </select>
                    </FormGroup>
                  </FormRow>

                  {/* Balance info bar */}
                  {employeeBalance && (
                    <div style={{ padding: '12px', backgroundColor: exceedsBalance ? '#FEF2F2' : '#EFF6FF', border: `1px solid ${exceedsBalance ? '#FECACA' : '#BFDBFE'}`, borderRadius: '8px' }}>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle size={14} style={{ color: exceedsBalance ? '#EF4444' : '#3B82F6' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: exceedsBalance ? '#991B1B' : '#1D4ED8' }}>
                          {selectedLeaveType?.name} Balance
                        </span>
                      </div>
                      <div className="flex gap-6" style={{ fontSize: '13px' }}>
                        <span>Total: <strong>{employeeBalance.total}</strong></span>
                        <span>Taken: <strong>{employeeBalance.taken}</strong></span>
                        {(employeeBalance.pending ?? 0) > 0 && <span>Pending: <strong>{employeeBalance.pending}</strong></span>}
                        <span style={{ color: exceedsBalance ? '#991B1B' : '#065F46' }}>Available: <strong>{employeeBalance.available}</strong></span>
                      </div>
                    </div>
                  )}
                </FormSection>

                {/* Dates */}
                <FormSection title="Dates">
                  <FormRow columns={3}>
                    <FormGroup label="Start Date" required error={errors.start_date}>
                      <input className="tibbna-input" type="date" value={form.start_date} onChange={e => update('start_date', e.target.value)} />
                    </FormGroup>
                    <FormGroup label="End Date" required error={errors.end_date}>
                      <input className="tibbna-input" type="date" value={form.end_date} onChange={e => update('end_date', e.target.value)} min={form.start_date} />
                    </FormGroup>
                    <FormGroup label="Duration">
                      <div className="tibbna-input flex items-center gap-2" style={{ backgroundColor: '#f9fafb', fontWeight: 600 }}>
                        <Clock size={14} style={{ color: '#618FF5' }} />
                        {workingDays} working day(s)
                        {totalCalendarDays > 0 && totalCalendarDays !== workingDays && (
                          <span style={{ fontSize: '11px', fontWeight: 400, color: '#a3a3a3' }}>({totalCalendarDays} calendar)</span>
                        )}
                      </div>
                    </FormGroup>
                  </FormRow>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="halfDay" checked={form.is_half_day} onChange={e => update('is_half_day', e.target.checked)} style={{ accentColor: '#618FF5' }} />
                    <label htmlFor="halfDay" style={{ fontSize: '13px', color: '#525252' }}>Half-day leave</label>
                  </div>
                </FormSection>

                {/* Details */}
                <FormSection title="Details">
                  <FormGroup label="Reason" required error={errors.reason}>
                    <textarea
                      className="tibbna-input"
                      style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                      value={form.reason}
                      onChange={e => update('reason', e.target.value)}
                      placeholder="Provide reason for leave request..."
                      maxLength={500}
                    />
                    <span style={{ fontSize: '11px', color: '#a3a3a3' }}>{form.reason.length}/500</span>
                  </FormGroup>

                  {/* Supporting document */}
                  {selectedLeaveType?.requires_doc && (
                    <FormGroup label="Supporting Document" required error={errors.supporting_document}>
                      <div style={{ padding: '12px', border: '2px dashed #d4d4d4', borderRadius: '8px', textAlign: 'center' }}>
                        <input
                          type="file"
                          id="docUpload"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={e => { setDocFile(e.target.files?.[0] || null); if (errors.supporting_document) setErrors(prev => { const n = { ...prev }; delete n.supporting_document; return n; }); }}
                          style={{ display: 'none' }}
                        />
                        <label htmlFor="docUpload" style={{ cursor: 'pointer' }}>
                          <Upload size={20} style={{ color: '#618FF5', margin: '0 auto 4px' }} />
                          <p style={{ fontSize: '12px', color: '#525252' }}>Click to upload (PDF, JPG, PNG)</p>
                        </label>
                        {docFile && (
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <FileText size={14} style={{ color: '#10B981' }} />
                            <span style={{ fontSize: '12px', color: '#10B981' }}>{docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)</span>
                          </div>
                        )}
                      </div>
                    </FormGroup>
                  )}

                  {/* Contact during leave */}
                  <FormRow columns={2}>
                    <FormGroup label="Contact Number During Leave">
                      <input className="tibbna-input" type="tel" value={form.contact_number} onChange={e => update('contact_number', e.target.value)} placeholder="+964-xxx-xxx-xxxx" />
                    </FormGroup>
                    <div />
                  </FormRow>
                </FormSection>

                {/* Approval Workflow */}
                <FormSection title="Approval Workflow (Iraqi Req #22)">
                  <ApprovalWorkflow steps={[
                    { label: 'Submit', status: 'APPROVED', approver: 'Employee' },
                    { label: 'Department Manager', status: 'NOT_STARTED', approver: 'Department Head' },
                    { label: 'HR Review', status: 'NOT_STARTED', approver: 'HR Department' },
                    ...(workingDays > 14 ? [{ label: 'CEO Approval', status: 'NOT_STARTED' as const, approver: 'CEO' }] : []),
                  ]} />
                  {workingDays > 14 && (
                    <p style={{ fontSize: '11px', color: '#F59E0B', marginTop: '4px' }}>
                      ⚠ Leave requests exceeding 14 working days require CEO approval
                    </p>
                  )}
                </FormSection>

                <FormActions>
                  <Link href="/hr/leaves"><button className="btn-secondary">Cancel</button></Link>
                  <button className="btn-primary" onClick={handlePreview}>Preview Request</button>
                </FormActions>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* Preview                                                       */
            /* ============================================================ */
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
                  <div>
                    <span style={{ color: '#a3a3a3' }}>Working Days</span>
                    <p style={{ fontWeight: 600, color: '#1D4ED8' }}>{workingDays} day(s)</p>
                    {totalCalendarDays !== workingDays && (
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{totalCalendarDays} calendar days</p>
                    )}
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '13px', color: '#a3a3a3' }}>Reason</span>
                  <p style={{ fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>{form.reason}</p>
                </div>

                {docFile && (
                  <div>
                    <span style={{ fontSize: '13px', color: '#a3a3a3' }}>Supporting Document</span>
                    <p style={{ fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>{docFile.name}</p>
                  </div>
                )}

                {/* Balance impact */}
                {employeeBalance && (
                  <div style={{ padding: '12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#166534', marginBottom: '4px' }}>Balance Impact</p>
                    <div className="flex gap-6" style={{ fontSize: '12px', color: '#166534' }}>
                      <span>Current: <strong>{employeeBalance.available}</strong></span>
                      <span>After: <strong>{Math.max(0, employeeBalance.available - workingDays)}</strong></span>
                      <span>Deducted: <strong>-{workingDays}</strong></span>
                    </div>
                  </div>
                )}

                {/* Approval chain preview */}
                <div>
                  <p style={{ fontSize: '13px', color: '#a3a3a3', marginBottom: '8px' }}>Approval Chain</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {['Employee (Submit)', 'Dept. Manager', 'HR Review', ...(workingDays > 14 ? ['CEO'] : [])].map((step, i, arr) => (
                      <span key={step} className="flex items-center gap-1">
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px', borderRadius: '50%', fontSize: '10px', fontWeight: 600, backgroundColor: i === 0 ? '#D1FAE5' : '#F3F4F6', color: i === 0 ? '#065F46' : '#6B7280' }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '12px', color: '#525252' }}>{step}</span>
                        {i < arr.length - 1 && <span style={{ color: '#d4d4d4', margin: '0 4px' }}>→</span>}
                      </span>
                    ))}
                  </div>
                </div>

                <FormActions>
                  <button className="btn-secondary" onClick={() => setShowPreview(false)} disabled={submitting}>Back to Edit</button>
                  <button className="btn-primary flex items-center gap-2" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Submitting...</>
                    ) : (
                      <><Save size={16} /> Submit Request</>
                    )}
                  </button>
                </FormActions>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT: Leave Balances Sidebar                                 */}
        {/* ============================================================ */}
        <div className="lg:col-span-1 space-y-4">
          {/* Employee info */}
          {selectedEmployee && (
            <div className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                    <Users size={18} style={{ color: '#618FF5' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                    <p style={{ fontSize: '11px', color: '#6B7280' }}>{selectedEmployee.department_name} • {selectedEmployee.job_title}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leave Balances */}
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Leave Balances</h3>

              {!form.employee_id ? (
                <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Select an employee to view balances</p>
              ) : (
                <div className="space-y-2">
                  {allBalances.map(b => (
                    <div
                      key={b.code}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        backgroundColor: b.isSelected ? '#EFF6FF' : '#F9FAFB',
                        border: b.isSelected ? '1px solid #BFDBFE' : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: b.color, display: 'inline-block' }} />
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#374151' }}>{b.name}</span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: b.isSelected ? '#1D4ED8' : '#111827' }}>
                          {b.available}
                        </span>
                      </div>
                      <div className="flex gap-4" style={{ fontSize: '10px', color: '#9CA3AF' }}>
                        <span>Total: {b.total}</span>
                        <span>Taken: {b.taken}</span>
                        {b.pending > 0 && <span>Pending: {b.pending}</span>}
                      </div>
                      {/* Progress bar */}
                      <div style={{ marginTop: '4px', height: '3px', backgroundColor: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${b.total > 0 ? ((b.taken / b.total) * 100) : 0}%`, backgroundColor: b.color, borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Policy info */}
          {selectedLeaveType && (
            <div className="tibbna-card">
              <div className="tibbna-card-content">
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>{selectedLeaveType.name} Policy</h3>
                <div className="space-y-2" style={{ fontSize: '12px', color: '#525252' }}>
                  <div className="flex justify-between"><span>Category</span><span className="tibbna-badge" style={{ fontSize: '10px' }}>{selectedLeaveType.category}</span></div>
                  <div className="flex justify-between"><span>Max Days</span><strong>{selectedLeaveType.max_days}</strong></div>
                  <div className="flex justify-between"><span>Max Consecutive</span><strong>{selectedLeaveType.max_consecutive}</strong></div>
                  <div className="flex justify-between"><span>Notice Required</span><strong>{selectedLeaveType.notice_days} days</strong></div>
                  <div className="flex justify-between"><span>Carry Forward</span><strong>{selectedLeaveType.carry_forward ? `Yes (max ${selectedLeaveType.max_carry})` : 'No'}</strong></div>
                  <div className="flex justify-between"><span>Documentation</span><strong>{selectedLeaveType.requires_doc ? 'Required' : 'Not required'}</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
