'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Home, Users, Pencil, Trash2, UserPlus, X, AlertTriangle, Search } from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import type { BenefitPlan, BenefitEnrollment, Employee } from '@/types/hr';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE: { bg: '#D1FAE5', text: '#065F46' }, PENDING: { bg: '#FEF3C7', text: '#92400E' }, CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function HousingBenefitsPage() {
  const [allPlans, setAllPlans] = useState<BenefitPlan[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<BenefitEnrollment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [enrollPlanId, setEnrollPlanId] = useState('');
  const [enrollEmpId, setEnrollEmpId] = useState('');
  const [editEnrollId, setEditEnrollId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'CANCELLED' | 'PENDING'>('ACTIVE');
  const [deleteTarget, setDeleteTarget] = useState<BenefitEnrollment | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(() => {
    try {
      setAllPlans(dataStore.getBenefitPlans());
      setAllEnrollments(dataStore.getBenefitEnrollments());
      setEmployees(dataStore.getEmployees());
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const plans = useMemo(() => allPlans.filter(p => p.type === 'HOUSING'), [allPlans]);
  const planIds = useMemo(() => plans.map(p => p.id), [plans]);
  const enrollments = useMemo(() => allEnrollments.filter(e => planIds.includes(e.plan_id)), [allEnrollments, planIds]);
  const activeEnrollments = useMemo(() => enrollments.filter(e => e.status === 'ACTIVE'), [enrollments]);
  const activeEmps = useMemo(() => employees.filter(e => e.employment_status === 'ACTIVE'), [employees]);

  const housingAllowanceTotal = useMemo(() => activeEmps.reduce((s, e) => s + Math.round((e.basic_salary || 0) * 0.20), 0), [activeEmps]);

  const byGrade = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    activeEmps.forEach(e => {
      const g = e.grade_id || 'N/A';
      if (!map[g]) map[g] = { count: 0, total: 0 };
      map[g].count++;
      map[g].total += Math.round((e.basic_salary || 0) * 0.20);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [activeEmps]);

  const filteredEmps = useMemo(() => {
    if (!searchQuery.trim()) return activeEmps;
    const q = searchQuery.toLowerCase();
    return activeEmps.filter(e =>
      `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
      (e.department_name || '').toLowerCase().includes(q) ||
      (e.grade_id || '').toLowerCase().includes(q)
    );
  }, [activeEmps, searchQuery]);

  const handleEnroll = useCallback(() => {
    if (!enrollEmpId || !enrollPlanId) { toast.error('Select employee and plan'); return; }
    setProcessing(true);
    const emp = employees.find(e => e.id === enrollEmpId);
    const plan = allPlans.find(p => p.id === enrollPlanId);
    const newId = `BE-${String(allEnrollments.length + 1).padStart(3, '0')}`;
    const ok = dataStore.addBenefitEnrollment({
      id: newId, employee_id: enrollEmpId, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : '',
      plan_id: enrollPlanId, plan_name: plan?.name || '', status: 'ACTIVE',
      start_date: new Date().toISOString().split('T')[0],
    } as BenefitEnrollment);
    if (ok) { toast.success('Employee enrolled in housing'); setShowEnrollForm(false); setEnrollEmpId(''); setEnrollPlanId(''); loadData(); }
    else toast.error('Failed');
    setProcessing(false);
  }, [enrollEmpId, enrollPlanId, employees, allPlans, allEnrollments.length, loadData]);

  const handleEditSave = useCallback(() => {
    if (!editEnrollId) return;
    setProcessing(true);
    const ok = dataStore.updateBenefitEnrollment(editEnrollId, { status: editStatus });
    if (ok) { toast.success('Updated'); setEditEnrollId(null); loadData(); }
    else toast.error('Failed');
    setProcessing(false);
  }, [editEnrollId, editStatus, loadData]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    setProcessing(true);
    const ok = dataStore.deleteBenefitEnrollment(deleteTarget.id);
    if (ok) { toast.success('Removed'); setDeleteTarget(null); loadData(); }
    else toast.error('Failed');
    setProcessing(false);
  }, [deleteTarget, loadData]);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto" /></div>;

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/benefits"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Housing Benefits</h2>
            <p className="page-description">Housing allowances and accommodation support · {plans.length} plan(s) · {activeEnrollments.length} enrolled</p>
          </div>
        </div>
        {plans.length > 0 && (
          <button onClick={() => setShowEnrollForm(true)} className="btn-primary flex items-center gap-1.5"><UserPlus size={15} /> Enroll Employee</button>
        )}
      </div>

      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Receiving Allowance</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{activeEmps.length}</p></div><Users size={20} style={{ color: '#10B981' }} /></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Monthly Total</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{(housingAllowanceTotal / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Avg per Employee</p><p className="tibbna-card-value">{activeEmps.length > 0 ? (housingAllowanceTotal / activeEmps.length / 1000).toFixed(0) : 0}K</p><p className="tibbna-card-subtitle">IQD/month</p></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><p className="tibbna-card-title">Rate</p><p className="tibbna-card-value">20%</p><p className="tibbna-card-subtitle">of basic salary</p></div></div>
      </div>

      {/* Housing Plan Enrollments (if any plans exist) */}
      {plans.length > 0 && enrollments.length > 0 && (
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Staff Housing Enrollments ({enrollments.length})</h3></div>
          <div className="tibbna-card-content">
            <div className="hidden md:block tibbna-table-container">
              <table className="tibbna-table">
                <thead><tr><th>Employee</th><th>Plan</th><th>Since</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
                <tbody>
                  {enrollments.map(enr => {
                    const sc = STATUS_COLORS[enr.status] || { bg: '#F3F4F6', text: '#374151' };
                    return (
                      <tr key={enr.id}>
                        <td><Link href={`/hr/employees/${enr.employee_id}`} className="hover:underline" style={{ fontSize: '13px', fontWeight: 500, color: '#618FF5' }}>{enr.employee_name}</Link></td>
                        <td style={{ fontSize: '12px' }}>{enr.plan_name}</td>
                        <td style={{ fontSize: '12px' }}>{enr.start_date || '-'}</td>
                        <td><span className="tibbna-badge" style={{ ...sc, fontSize: '10px' }}>{enr.status}</span></td>
                        <td>
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => { setEditEnrollId(enr.id); setEditStatus(enr.status); }} className="btn-secondary" style={{ fontSize: '11px', padding: '3px 8px' }}><Pencil size={11} /></button>
                            <button onClick={() => setDeleteTarget(enr)} className="btn-secondary" style={{ fontSize: '11px', padding: '3px 8px', color: '#DC2626' }}><Trash2 size={11} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2">
              {enrollments.map(enr => {
                const sc = STATUS_COLORS[enr.status] || { bg: '#F3F4F6', text: '#374151' };
                return (
                  <div key={enr.id} style={{ padding: '8px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
                    <div className="flex justify-between mb-1">
                      <Link href={`/hr/employees/${enr.employee_id}`} style={{ fontSize: '13px', fontWeight: 600, color: '#618FF5' }}>{enr.employee_name}</Link>
                      <span className="tibbna-badge" style={{ ...sc, fontSize: '10px' }}>{enr.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{enr.plan_name}</p>
                    <div className="flex gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid #f0f0f0' }}>
                      <button onClick={() => { setEditEnrollId(enr.id); setEditStatus(enr.status); }} className="btn-secondary flex items-center gap-1" style={{ fontSize: '11px', padding: '3px 8px' }}><Pencil size={11} /> Edit</button>
                      <button onClick={() => setDeleteTarget(enr)} className="btn-secondary flex items-center gap-1" style={{ fontSize: '11px', padding: '3px 8px', color: '#DC2626' }}><Trash2 size={11} /> Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Policy */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Housing Allowance Policy</h3></div>
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" style={{ fontSize: '13px' }}>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
              <p style={{ color: '#a3a3a3', marginBottom: '4px' }}>Calculation</p>
              <p style={{ fontWeight: 600 }}>20% of Basic Salary</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
              <p style={{ color: '#a3a3a3', marginBottom: '4px' }}>Eligibility</p>
              <p style={{ fontWeight: 600 }}>All Active Employees</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
              <p style={{ color: '#a3a3a3', marginBottom: '4px' }}>Payment</p>
              <p style={{ fontWeight: 600 }}>Monthly with Salary</p>
            </div>
            <div style={{ padding: '12px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
              <p style={{ color: '#a3a3a3', marginBottom: '4px' }}>Taxable</p>
              <p style={{ fontWeight: 600 }}>Yes</p>
            </div>
          </div>
        </div>
      </div>

      {/* By Grade */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header"><h3 className="tibbna-section-title" style={{ margin: 0 }}>Housing Allowance by Grade</h3></div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container">
            <table className="tibbna-table">
              <thead><tr><th>Grade</th><th>Employees</th><th>Avg Allowance</th><th>Total Monthly</th></tr></thead>
              <tbody>
                {byGrade.map(([grade, data]) => (
                  <tr key={grade}>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{grade}</td>
                    <td style={{ fontSize: '13px' }}>{data.count}</td>
                    <td style={{ fontSize: '13px' }}>{(data.total / data.count / 1000).toFixed(0)}K IQD</td>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{(data.total / 1000).toFixed(0)}K IQD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {byGrade.map(([grade, data]) => (
              <div key={grade} style={{ padding: '10px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{grade}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{(data.total / 1000).toFixed(0)}K IQD</span>
                </div>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{data.count} employees | Avg: {(data.total / data.count / 1000).toFixed(0)}K IQD</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>All Employees ({filteredEmps.length})</h3>
          <div className="relative" style={{ width: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
            <input className="tibbna-input" style={{ paddingLeft: '32px', fontSize: '12px' }} placeholder="Search employees…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="tibbna-card-content">
          <div className="hidden md:block tibbna-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="tibbna-table">
              <thead><tr><th>Employee</th><th>Grade</th><th>Basic Salary</th><th>Housing (20%)</th></tr></thead>
              <tbody>
                {filteredEmps.map(e => (
                  <tr key={e.id}>
                    <td>
                      <Link href={`/hr/employees/${e.id}`} className="hover:underline" style={{ fontSize: '13px', fontWeight: 500, color: '#618FF5' }}>{e.first_name} {e.last_name}</Link>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{e.department_name}</p>
                    </td>
                    <td style={{ fontSize: '12px' }}>{e.grade_id}</td>
                    <td style={{ fontSize: '12px' }}>{((e.basic_salary || 0) / 1000).toFixed(0)}K</td>
                    <td style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>{((e.basic_salary || 0) * 0.20 / 1000).toFixed(0)}K IQD</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {filteredEmps.slice(0, 20).map(e => (
              <div key={e.id} style={{ padding: '8px', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
                <div className="flex justify-between">
                  <Link href={`/hr/employees/${e.id}`} style={{ fontSize: '13px', fontWeight: 500, color: '#618FF5' }}>{e.first_name} {e.last_name}</Link>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#10B981' }}>{((e.basic_salary || 0) * 0.20 / 1000).toFixed(0)}K</span>
                </div>
                <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{e.department_name} | {e.grade_id}</p>
              </div>
            ))}
            {filteredEmps.length > 20 && <p style={{ fontSize: '12px', color: '#a3a3a3', textAlign: 'center' }}>+{filteredEmps.length - 20} more</p>}
          </div>
        </div>
      </div>

      {/* Enroll Modal */}
      {showEnrollForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Enroll in Housing Plan</h3>
              <button onClick={() => { setShowEnrollForm(false); setEnrollPlanId(''); setEnrollEmpId(''); }} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Employee *</label>
                <select className="tibbna-input" value={enrollEmpId} onChange={e => setEnrollEmpId(e.target.value)}>
                  <option value="">Select…</option>
                  {activeEmps.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.job_title}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Plan *</label>
                <select className="tibbna-input" value={enrollPlanId} onChange={e => setEnrollPlanId(e.target.value)}>
                  <option value="">Select…</option>
                  {plans.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setShowEnrollForm(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleEnroll} disabled={processing || !enrollEmpId || !enrollPlanId}>{processing ? 'Enrolling…' : 'Enroll'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editEnrollId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Edit Enrollment</h3>
              <button onClick={() => setEditEnrollId(null)} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4">
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Status</label>
              <select className="tibbna-input" value={editStatus} onChange={e => setEditStatus(e.target.value as any)}>
                <option value="ACTIVE">Active</option><option value="PENDING">Pending</option><option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setEditEnrollId(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleEditSave} disabled={processing}>{processing ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 text-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><AlertTriangle size={24} style={{ color: '#DC2626' }} /></div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Remove Enrollment?</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>Remove <strong>{deleteTarget.employee_name}</strong> from <strong>{deleteTarget.plan_name}</strong>?</p>
            </div>
            <div className="flex justify-center gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ backgroundColor: '#DC2626' }} onClick={handleDelete} disabled={processing}>{processing ? 'Removing…' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
