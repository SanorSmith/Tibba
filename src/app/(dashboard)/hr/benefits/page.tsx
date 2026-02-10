'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Heart, Shield, Car, Home, UtensilsCrossed, DollarSign, GraduationCap,
  Plus, Pencil, Trash2, Eye, X, Search, RotateCcw, AlertTriangle,
  UserPlus, Users
} from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import type { BenefitPlan, BenefitEnrollment, Employee } from '@/types/hr';

// ============================================================================
// CONSTANTS
// ============================================================================
const PLAN_TYPES = ['HEALTH_INSURANCE', 'LIFE_INSURANCE', 'TRANSPORT', 'HOUSING', 'MEAL', 'EDUCATION'] as const;
const CATEGORIES = ['MANDATORY', 'OPTIONAL', 'EMPLOYER_PAID', 'SHARED_COST'] as const;

const TYPE_META: Record<string, { icon: any; color: string; bg: string; route: string; label: string }> = {
  HEALTH_INSURANCE: { icon: Shield,            color: '#2563EB', bg: '#DBEAFE', route: '/hr/benefits/health-insurance', label: 'Health Insurance' },
  LIFE_INSURANCE:   { icon: Shield,            color: '#7C3AED', bg: '#EDE9FE', route: '/hr/benefits/health-insurance', label: 'Life Insurance' },
  TRANSPORT:        { icon: Car,               color: '#0891B2', bg: '#CFFAFE', route: '/hr/benefits/transport',        label: 'Transport' },
  HOUSING:          { icon: Home,              color: '#059669', bg: '#D1FAE5', route: '/hr/benefits/housing',          label: 'Housing' },
  MEAL:             { icon: UtensilsCrossed,   color: '#D97706', bg: '#FEF3C7', route: '/hr/benefits',                 label: 'Meal' },
  EDUCATION:        { icon: GraduationCap,     color: '#DC2626', bg: '#FEE2E2', route: '/hr/benefits',                 label: 'Education' },
};

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  MANDATORY:     { bg: '#FEE2E2', text: '#991B1B' },
  OPTIONAL:      { bg: '#E0E7FF', text: '#4338CA' },
  EMPLOYER_PAID: { bg: '#D1FAE5', text: '#065F46' },
  SHARED_COST:   { bg: '#FEF3C7', text: '#92400E' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE:    { bg: '#D1FAE5', text: '#065F46' },
  PENDING:   { bg: '#FEF3C7', text: '#92400E' },
  CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
};

const EMPTY_PLAN: Omit<BenefitPlan, 'id'> = {
  name: '', type: 'HEALTH_INSURANCE', category: 'MANDATORY',
  cost_employee: 0, cost_employer: 0, coverage: 0,
  provider: '', eligible: [], is_active: true,
};

const EMPTY_ENROLLMENT: Omit<BenefitEnrollment, 'id'> = {
  employee_id: '', employee_name: '', plan_id: '', plan_name: '',
  status: 'ACTIVE', start_date: new Date().toISOString().split('T')[0],
  dependents: 0,
};

export default function BenefitsPage() {
  // =========================================================================
  // STATE
  // =========================================================================
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [enrollments, setEnrollments] = useState<BenefitEnrollment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<'plans' | 'enrollments'>('plans');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Plan modals
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN);
  const [showPlanDetail, setShowPlanDetail] = useState<BenefitPlan | null>(null);
  const [deletePlanTarget, setDeletePlanTarget] = useState<BenefitPlan | null>(null);

  // Enrollment modals
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [editingEnrollId, setEditingEnrollId] = useState<string | null>(null);
  const [enrollForm, setEnrollForm] = useState(EMPTY_ENROLLMENT);
  const [deleteEnrollTarget, setDeleteEnrollTarget] = useState<BenefitEnrollment | null>(null);

  const [processing, setProcessing] = useState(false);

  // =========================================================================
  // LOAD DATA
  // =========================================================================
  const loadData = useCallback(() => {
    try {
      setPlans(dataStore.getBenefitPlans());
      setEnrollments(dataStore.getBenefitEnrollments());
      setEmployees(dataStore.getEmployees());
    } catch (err) {
      console.error('Error loading benefits:', err);
      toast.error('Failed to load benefits data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // =========================================================================
  // DERIVED
  // =========================================================================
  const activeEnrollments = useMemo(() => enrollments.filter(e => e.status === 'ACTIVE'), [enrollments]);

  const totalEmployerCost = useMemo(() =>
    plans.reduce((sum, p) => {
      const count = activeEnrollments.filter(e => e.plan_id === p.id).length;
      return sum + (p.cost_employer * count);
    }, 0),
  [plans, activeEnrollments]);

  const totalEmployeeCost = useMemo(() =>
    plans.reduce((sum, p) => {
      const count = activeEnrollments.filter(e => e.plan_id === p.id).length;
      return sum + (p.cost_employee * count);
    }, 0),
  [plans, activeEnrollments]);

  const filteredPlans = useMemo(() => {
    let list = plans;
    if (typeFilter !== 'all') list = list.filter(p => p.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.provider || '').toLowerCase().includes(q));
    }
    return list;
  }, [plans, typeFilter, searchQuery]);

  const filteredEnrollments = useMemo(() => {
    let list = enrollments;
    if (typeFilter !== 'all') {
      const planIds = plans.filter(p => p.type === typeFilter).map(p => p.id);
      list = list.filter(e => planIds.includes(e.plan_id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(e => e.employee_name.toLowerCase().includes(q) || e.plan_name.toLowerCase().includes(q));
    }
    return list;
  }, [enrollments, plans, typeFilter, searchQuery]);

  const planEnrollCount = useCallback(
    (planId: string) => activeEnrollments.filter(e => e.plan_id === planId).length,
    [activeEnrollments]
  );

  const hasFilters = typeFilter !== 'all' || searchQuery.trim() !== '';

  // =========================================================================
  // PLAN FORM HANDLERS
  // =========================================================================
  const openCreatePlan = () => { setEditingPlanId(null); setPlanForm({ ...EMPTY_PLAN }); setShowPlanForm(true); };

  const openEditPlan = (p: BenefitPlan) => {
    setEditingPlanId(p.id);
    setPlanForm({
      name: p.name, type: p.type, category: p.category,
      cost_employee: p.cost_employee, cost_employer: p.cost_employer,
      coverage: p.coverage || 0, provider: p.provider || '',
      eligible: p.eligible || [], is_active: p.is_active,
    });
    setShowPlanForm(true);
  };

  const closePlanForm = () => { setShowPlanForm(false); setEditingPlanId(null); setPlanForm({ ...EMPTY_PLAN }); };

  const handleSavePlan = useCallback(() => {
    if (!planForm.name.trim()) { toast.error('Plan name is required'); return; }
    setProcessing(true);
    try {
      if (editingPlanId) {
        const ok = dataStore.updateBenefitPlan(editingPlanId, planForm as Partial<BenefitPlan>);
        if (ok) { toast.success('Plan updated'); closePlanForm(); loadData(); }
        else toast.error('Failed to update');
      } else {
        const newId = `BP-${String(plans.length + 1).padStart(3, '0')}`;
        const ok = dataStore.addBenefitPlan({ id: newId, ...planForm } as BenefitPlan);
        if (ok) { toast.success('Plan created', { description: `ID: ${newId}` }); closePlanForm(); loadData(); }
        else toast.error('Failed to create');
      }
    } catch { toast.error('Error saving plan'); }
    finally { setProcessing(false); }
  }, [editingPlanId, planForm, plans.length, loadData]);

  const handleDeletePlan = useCallback(() => {
    if (!deletePlanTarget) return;
    const count = planEnrollCount(deletePlanTarget.id);
    if (count > 0) { toast.error(`Cannot delete: ${count} active enrollment(s)`); setDeletePlanTarget(null); return; }
    setProcessing(true);
    try {
      const ok = dataStore.deleteBenefitPlan(deletePlanTarget.id);
      if (ok) { toast.success('Plan deleted'); setDeletePlanTarget(null); loadData(); }
      else toast.error('Failed to delete');
    } catch { toast.error('Error deleting plan'); }
    finally { setProcessing(false); }
  }, [deletePlanTarget, planEnrollCount, loadData]);

  // =========================================================================
  // ENROLLMENT FORM HANDLERS
  // =========================================================================
  const openCreateEnroll = (preselectedPlanId?: string) => {
    setEditingEnrollId(null);
    const ef = { ...EMPTY_ENROLLMENT };
    if (preselectedPlanId) {
      const plan = plans.find(p => p.id === preselectedPlanId);
      if (plan) { ef.plan_id = plan.id; ef.plan_name = plan.name; }
    }
    setEnrollForm(ef);
    setShowEnrollForm(true);
  };

  const openEditEnroll = (e: BenefitEnrollment) => {
    setEditingEnrollId(e.id);
    setEnrollForm({
      employee_id: e.employee_id, employee_name: e.employee_name,
      plan_id: e.plan_id, plan_name: e.plan_name,
      status: e.status, start_date: e.start_date || '',
      dependents: e.dependents || 0, notes: e.notes || '',
    });
    setShowEnrollForm(true);
  };

  const closeEnrollForm = () => { setShowEnrollForm(false); setEditingEnrollId(null); setEnrollForm({ ...EMPTY_ENROLLMENT }); };

  const handleSaveEnroll = useCallback(() => {
    if (!enrollForm.employee_id || !enrollForm.plan_id) { toast.error('Employee and Plan are required'); return; }
    setProcessing(true);
    try {
      if (editingEnrollId) {
        const ok = dataStore.updateBenefitEnrollment(editingEnrollId, enrollForm as Partial<BenefitEnrollment>);
        if (ok) { toast.success('Enrollment updated'); closeEnrollForm(); loadData(); }
        else toast.error('Failed to update');
      } else {
        const newId = `BE-${String(enrollments.length + 1).padStart(3, '0')}`;
        const ok = dataStore.addBenefitEnrollment({ id: newId, ...enrollForm } as BenefitEnrollment);
        if (ok) { toast.success('Employee enrolled', { description: `${enrollForm.employee_name} → ${enrollForm.plan_name}` }); closeEnrollForm(); loadData(); }
        else toast.error('Failed to enroll');
      }
    } catch { toast.error('Error saving enrollment'); }
    finally { setProcessing(false); }
  }, [editingEnrollId, enrollForm, enrollments.length, loadData]);

  const handleDeleteEnroll = useCallback(() => {
    if (!deleteEnrollTarget) return;
    setProcessing(true);
    try {
      const ok = dataStore.deleteBenefitEnrollment(deleteEnrollTarget.id);
      if (ok) { toast.success('Enrollment removed'); setDeleteEnrollTarget(null); loadData(); }
      else toast.error('Failed to remove');
    } catch { toast.error('Error removing enrollment'); }
    finally { setProcessing(false); }
  }, [deleteEnrollTarget, loadData]);

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================
  const updatePlanField = (k: string, v: any) => setPlanForm(prev => ({ ...prev, [k]: v }));
  const updateEnrollField = (k: string, v: any) => setEnrollForm(prev => ({ ...prev, [k]: v }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto mb-3" />
          <p style={{ fontSize: '13px', color: '#a3a3a3' }}>Loading benefits…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Benefits Management</h2>
          <p className="page-description">{plans.length} plans · {activeEnrollments.length} active enrollments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/hr/benefits/health-insurance"><button className="btn-secondary flex items-center gap-1.5"><Shield size={14} /> Insurance</button></Link>
          <Link href="/hr/benefits/transport"><button className="btn-secondary flex items-center gap-1.5"><Car size={14} /> Transport</button></Link>
          <Link href="/hr/benefits/housing"><button className="btn-secondary flex items-center gap-1.5"><Home size={14} /> Housing</button></Link>
          {activeTab === 'plans'
            ? <button onClick={openCreatePlan} className="btn-primary flex items-center gap-1.5"><Plus size={15} /> New Plan</button>
            : <button onClick={() => openCreateEnroll()} className="btn-primary flex items-center gap-1.5"><UserPlus size={15} /> Enroll Employee</button>
          }
        </div>
      </div>

      {/* ================================================================= */}
      {/* KPI CARDS                                                         */}
      {/* ================================================================= */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Benefit Plans</p><p className="tibbna-card-value" style={{ color: '#3B82F6' }}>{plans.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Heart size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Active Enrollments</p><p className="tibbna-card-value" style={{ color: '#059669' }}>{activeEnrollments.length}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><Users size={20} style={{ color: '#059669' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Employer Cost/mo</p><p className="tibbna-card-value" style={{ color: '#EF4444' }}>{(totalEmployerCost / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}><DollarSign size={20} style={{ color: '#EF4444' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Employee Cost/mo</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{(totalEmployeeCost / 1000000).toFixed(1)}M</p><p className="tibbna-card-subtitle">IQD</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><DollarSign size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
      </div>

      {/* ================================================================= */}
      {/* TABS + FILTERS                                                    */}
      {/* ================================================================= */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1">
              {(['plans', 'enrollments'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={activeTab === tab ? 'btn-primary' : 'btn-secondary'}
                  style={{ fontSize: '12px', padding: '6px 14px', textTransform: 'capitalize' }}>
                  {tab === 'plans' ? `Plans (${filteredPlans.length})` : `Enrollments (${filteredEnrollments.length})`}
                </button>
              ))}
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
                <input className="tibbna-input" style={{ paddingLeft: '32px' }} placeholder="Search…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <select className="tibbna-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                {PLAN_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t]?.label || t}</option>)}
              </select>
              {hasFilters && (
                <button className="btn-secondary flex items-center gap-1 justify-center" onClick={() => { setTypeFilter('all'); setSearchQuery(''); }}>
                  <RotateCcw size={13} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* PLANS TAB                                                         */}
      {/* ================================================================= */}
      {activeTab === 'plans' && (
        <div className="tibbna-grid-2 tibbna-section">
          {filteredPlans.map(plan => {
            const meta = TYPE_META[plan.type] || { icon: Heart, color: '#6B7280', bg: '#F3F4F6', route: '/hr/benefits', label: plan.type };
            const Icon = meta.icon;
            const catC = CAT_COLORS[plan.category] || { bg: '#F3F4F6', text: '#374151' };
            const ec = planEnrollCount(plan.id);
            return (
              <div key={plan.id} className="tibbna-card">
                <div className="tibbna-card-content">
                  <div className="flex items-start gap-3">
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{plan.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span className="tibbna-badge" style={{ ...catC, fontSize: '10px' }}>{plan.category.replace(/_/g, ' ')}</span>
                            <span className="tibbna-badge" style={{ backgroundColor: meta.bg, color: meta.color, fontSize: '10px' }}>{meta.label}</span>
                            {!plan.is_active && <span className="tibbna-badge" style={{ backgroundColor: '#FEE2E2', color: '#991B1B', fontSize: '10px' }}>INACTIVE</span>}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: '#525252', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {plan.provider && <span>Provider: {plan.provider}</span>}
                        <span>Employer: {(plan.cost_employer / 1000).toFixed(0)}K IQD/mo</span>
                        {plan.cost_employee > 0 && <span>Employee: {(plan.cost_employee / 1000).toFixed(0)}K IQD/mo</span>}
                        {plan.coverage && plan.coverage > 0 && <span>Coverage: {(plan.coverage / 1000000).toFixed(0)}M IQD</span>}
                        <span style={{ color: '#059669', fontWeight: 600 }}>{ec} enrolled</span>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                        <button onClick={() => setShowPlanDetail(plan)} className="btn-secondary flex items-center gap-1" style={{ fontSize: '11px', padding: '4px 10px' }}>
                          <Eye size={12} /> View
                        </button>
                        <button onClick={() => openEditPlan(plan)} className="btn-secondary flex items-center gap-1" style={{ fontSize: '11px', padding: '4px 10px' }}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => openCreateEnroll(plan.id)} className="btn-secondary flex items-center gap-1" style={{ fontSize: '11px', padding: '4px 10px', color: '#059669' }}>
                          <UserPlus size={12} /> Enroll
                        </button>
                        <button onClick={() => setDeletePlanTarget(plan)} className="btn-secondary flex items-center gap-1" style={{ fontSize: '11px', padding: '4px 10px', color: '#DC2626' }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredPlans.length === 0 && (
            <div className="col-span-full tibbna-card">
              <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '48px' }}>
                <Heart size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
                <p style={{ color: '#6B7280', fontSize: '13px' }}>No benefit plans found</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* ENROLLMENTS TAB                                                   */}
      {/* ================================================================= */}
      {activeTab === 'enrollments' && (
        <div className="tibbna-section">
          {/* Desktop table */}
          <div className="tibbna-card hidden md:block">
            <div className="tibbna-card-content">
              <div className="tibbna-table-container">
                <table className="tibbna-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Plan</th>
                      <th>Status</th>
                      <th>Start Date</th>
                      <th>Dependents</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnrollments.map(enr => {
                      const sc = STATUS_COLORS[enr.status] || { bg: '#F3F4F6', text: '#374151' };
                      return (
                        <tr key={enr.id}>
                          <td>
                            <Link href={`/hr/employees/${enr.employee_id}`} className="hover:underline" style={{ fontSize: '13px', fontWeight: 500, color: '#618FF5' }}>
                              {enr.employee_name}
                            </Link>
                          </td>
                          <td style={{ fontSize: '13px' }}>{enr.plan_name}</td>
                          <td><span className="tibbna-badge" style={{ ...sc, fontSize: '10px' }}>{enr.status}</span></td>
                          <td style={{ fontSize: '13px' }}>{enr.start_date || '-'}</td>
                          <td style={{ fontSize: '13px' }}>{enr.dependents ?? '-'}</td>
                          <td>
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => openEditEnroll(enr)} className="btn-secondary" style={{ fontSize: '11px', padding: '3px 8px' }}><Pencil size={11} /></button>
                              <button onClick={() => setDeleteEnrollTarget(enr)} className="btn-secondary" style={{ fontSize: '11px', padding: '3px 8px', color: '#DC2626' }}><Trash2 size={11} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-2">
            {filteredEnrollments.map(enr => {
              const sc = STATUS_COLORS[enr.status] || { bg: '#F3F4F6', text: '#374151' };
              return (
                <div key={enr.id} className="tibbna-card">
                  <div className="tibbna-card-content">
                    <div className="flex justify-between mb-1">
                      <Link href={`/hr/employees/${enr.employee_id}`} style={{ fontSize: '13px', fontWeight: 600, color: '#618FF5' }}>{enr.employee_name}</Link>
                      <span className="tibbna-badge" style={{ ...sc, fontSize: '10px' }}>{enr.status}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{enr.plan_name}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Since {enr.start_date || '-'}{enr.dependents ? ` · ${enr.dependents} dependents` : ''}</p>
                    <div className="flex gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid #f0f0f0' }}>
                      <button onClick={() => openEditEnroll(enr)} className="btn-secondary flex items-center gap-1" style={{ fontSize: '11px', padding: '3px 8px' }}><Pencil size={11} /> Edit</button>
                      <button onClick={() => setDeleteEnrollTarget(enr)} className="btn-secondary flex items-center gap-1" style={{ fontSize: '11px', padding: '3px 8px', color: '#DC2626' }}><Trash2 size={11} /> Remove</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredEnrollments.length === 0 && (
            <div className="tibbna-card">
              <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '48px' }}>
                <Users size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
                <p style={{ color: '#6B7280', fontSize: '13px' }}>No enrollments found</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* PLAN DETAIL MODAL                                                 */}
      {/* ================================================================= */}
      {showPlanDetail && (() => {
        const p = showPlanDetail;
        const meta = TYPE_META[p.type] || { icon: Heart, color: '#6B7280', bg: '#F3F4F6', route: '/hr/benefits', label: p.type };
        const planEnrollments = enrollments.filter(e => e.plan_id === p.id);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{p.name}</h3>
                <button onClick={() => setShowPlanDetail(null)} style={{ color: '#a3a3a3' }}><X size={16} /></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3" style={{ fontSize: '12px' }}>
                  <div><p style={{ color: '#6B7280' }}>Type</p><span className="tibbna-badge" style={{ backgroundColor: meta.bg, color: meta.color, fontSize: '10px' }}>{meta.label}</span></div>
                  <div><p style={{ color: '#6B7280' }}>Category</p><span className="tibbna-badge" style={{ ...(CAT_COLORS[p.category] || {}), fontSize: '10px' }}>{p.category.replace(/_/g, ' ')}</span></div>
                  <div><p style={{ color: '#6B7280' }}>Provider</p><p style={{ fontWeight: 600 }}>{p.provider || '-'}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Status</p><p style={{ fontWeight: 600, color: p.is_active ? '#059669' : '#DC2626' }}>{p.is_active ? 'Active' : 'Inactive'}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Employer Cost</p><p style={{ fontWeight: 600 }}>{(p.cost_employer / 1000).toFixed(0)}K IQD/mo</p></div>
                  <div><p style={{ color: '#6B7280' }}>Employee Cost</p><p style={{ fontWeight: 600 }}>{(p.cost_employee / 1000).toFixed(0)}K IQD/mo</p></div>
                  {p.coverage && p.coverage > 0 && <div><p style={{ color: '#6B7280' }}>Coverage</p><p style={{ fontWeight: 600 }}>{(p.coverage / 1000000).toFixed(0)}M IQD</p></div>}
                  <div><p style={{ color: '#6B7280' }}>Active Enrollments</p><p style={{ fontWeight: 600, color: '#059669' }}>{planEnrollments.filter(e => e.status === 'ACTIVE').length}</p></div>
                </div>
                {p.eligible && p.eligible.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Eligible Categories</p>
                    <div className="flex flex-wrap gap-1">{p.eligible.map(cat => <span key={cat} className="tibbna-badge" style={{ fontSize: '10px' }}>{cat}</span>)}</div>
                  </div>
                )}
                {planEnrollments.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Enrolled Employees ({planEnrollments.length})</p>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
                      {planEnrollments.map(enr => (
                        <div key={enr.id} className="flex items-center justify-between px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0', fontSize: '12px' }}>
                          <div>
                            <Link href={`/hr/employees/${enr.employee_id}`} className="hover:underline" style={{ fontWeight: 600, color: '#618FF5' }}>{enr.employee_name}</Link>
                            <p style={{ fontSize: '10px', color: '#a3a3a3' }}>Since {enr.start_date || '-'}</p>
                          </div>
                          <span className="tibbna-badge" style={{ ...(STATUS_COLORS[enr.status] || {}), fontSize: '10px' }}>{enr.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
                <button className="btn-secondary" onClick={() => { setShowPlanDetail(null); openEditPlan(p); }}><Pencil size={12} className="inline mr-1" /> Edit</button>
                <button className="btn-secondary" onClick={() => { setShowPlanDetail(null); openCreateEnroll(p.id); }}><UserPlus size={12} className="inline mr-1" /> Enroll</button>
                <Link href={meta.route}><button className="btn-secondary">Details Page</button></Link>
                <button className="btn-secondary" onClick={() => setShowPlanDetail(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* PLAN CREATE / EDIT MODAL                                          */}
      {/* ================================================================= */}
      {showPlanForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{editingPlanId ? 'Edit Benefit Plan' : 'New Benefit Plan'}</h3>
              <button onClick={closePlanForm} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Plan Name <span style={{ color: '#DC2626' }}>*</span></label>
                <input className="tibbna-input" value={planForm.name} onChange={e => updatePlanField('name', e.target.value)} placeholder="e.g. Health Insurance - Gold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Type</label>
                  <select className="tibbna-input" value={planForm.type} onChange={e => updatePlanField('type', e.target.value)}>
                    {PLAN_TYPES.map(t => <option key={t} value={t}>{TYPE_META[t]?.label || t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Category</label>
                  <select className="tibbna-input" value={planForm.category} onChange={e => updatePlanField('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Provider</label>
                <input className="tibbna-input" value={planForm.provider || ''} onChange={e => updatePlanField('provider', e.target.value)} placeholder="e.g. Al-Rafidain Insurance Co." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Employer Cost (IQD/mo)</label>
                  <input type="number" className="tibbna-input" value={planForm.cost_employer} onChange={e => updatePlanField('cost_employer', Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Employee Cost (IQD/mo)</label>
                  <input type="number" className="tibbna-input" value={planForm.cost_employee} onChange={e => updatePlanField('cost_employee', Number(e.target.value))} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Coverage (IQD)</label>
                <input type="number" className="tibbna-input" value={planForm.coverage || 0} onChange={e => updatePlanField('coverage', Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="plan-active" checked={planForm.is_active !== false} onChange={e => updatePlanField('is_active', e.target.checked)} />
                <label htmlFor="plan-active" style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Active</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={closePlanForm} disabled={processing}>Cancel</button>
              <button className="btn-primary" onClick={handleSavePlan} disabled={processing || !planForm.name.trim()}>
                {processing ? 'Saving…' : editingPlanId ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* ENROLLMENT CREATE / EDIT MODAL                                    */}
      {/* ================================================================= */}
      {showEnrollForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{editingEnrollId ? 'Edit Enrollment' : 'Enroll Employee'}</h3>
              <button onClick={closeEnrollForm} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Employee <span style={{ color: '#DC2626' }}>*</span></label>
                <select className="tibbna-input" value={enrollForm.employee_id}
                  onChange={e => {
                    const emp = employees.find(x => x.id === e.target.value);
                    updateEnrollField('employee_id', e.target.value);
                    if (emp) updateEnrollField('employee_name', `${emp.first_name} ${emp.last_name}`);
                  }}>
                  <option value="">Select employee…</option>
                  {employees.filter(e => e.employment_status === 'ACTIVE').map(e => (
                    <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.job_title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Benefit Plan <span style={{ color: '#DC2626' }}>*</span></label>
                <select className="tibbna-input" value={enrollForm.plan_id}
                  onChange={e => {
                    const plan = plans.find(p => p.id === e.target.value);
                    updateEnrollField('plan_id', e.target.value);
                    if (plan) updateEnrollField('plan_name', plan.name);
                  }}>
                  <option value="">Select plan…</option>
                  {plans.filter(p => p.is_active).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({TYPE_META[p.type]?.label || p.type})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Start Date</label>
                  <input type="date" className="tibbna-input" value={enrollForm.start_date || ''} onChange={e => updateEnrollField('start_date', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Status</label>
                  <select className="tibbna-input" value={enrollForm.status} onChange={e => updateEnrollField('status', e.target.value)}>
                    <option value="ACTIVE">Active</option>
                    <option value="PENDING">Pending</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Dependents</label>
                <input type="number" className="tibbna-input" value={enrollForm.dependents || 0} onChange={e => updateEnrollField('dependents', Number(e.target.value))} min={0} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Notes</label>
                <input className="tibbna-input" value={enrollForm.notes || ''} onChange={e => updateEnrollField('notes', e.target.value)} placeholder="Optional notes…" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={closeEnrollForm} disabled={processing}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveEnroll} disabled={processing || !enrollForm.employee_id || !enrollForm.plan_id}>
                {processing ? 'Saving…' : editingEnrollId ? 'Update Enrollment' : 'Enroll Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DELETE PLAN CONFIRMATION                                          */}
      {/* ================================================================= */}
      {deletePlanTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 text-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <AlertTriangle size={24} style={{ color: '#DC2626' }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Delete Plan?</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>
                Delete <strong>{deletePlanTarget.name}</strong>?
                {planEnrollCount(deletePlanTarget.id) > 0 && (
                  <span style={{ display: 'block', color: '#DC2626', fontWeight: 600, marginTop: '4px' }}>
                    {planEnrollCount(deletePlanTarget.id)} active enrollment(s) — cannot delete.
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setDeletePlanTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ backgroundColor: '#DC2626' }} onClick={handleDeletePlan} disabled={processing || planEnrollCount(deletePlanTarget.id) > 0}>
                {processing ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DELETE ENROLLMENT CONFIRMATION                                    */}
      {/* ================================================================= */}
      {deleteEnrollTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 text-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <AlertTriangle size={24} style={{ color: '#DC2626' }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Remove Enrollment?</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>
                Remove <strong>{deleteEnrollTarget.employee_name}</strong> from <strong>{deleteEnrollTarget.plan_name}</strong>?
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setDeleteEnrollTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ backgroundColor: '#DC2626' }} onClick={handleDeleteEnroll} disabled={processing}>
                {processing ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
