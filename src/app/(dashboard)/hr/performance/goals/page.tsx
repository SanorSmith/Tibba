'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Target, CheckCircle, Clock, TrendingUp, Plus, Pencil, Trash2, X, AlertTriangle, Search } from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import type { Goal, Employee } from '@/types/hr';

const GOAL_CATEGORIES = ['Clinical Quality', 'Professional Development', 'Leadership', 'Innovation', 'Research', 'Patient Care', 'Operational Efficiency', 'Teamwork', 'Communication'];
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: '#D1FAE5', text: '#065F46' }, IN_PROGRESS: { bg: '#DBEAFE', text: '#1D4ED8' },
  NOT_STARTED: { bg: '#F3F4F6', text: '#374151' }, CANCELLED: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function PerformanceGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [showProgress, setShowProgress] = useState<Goal | null>(null);
  const [processing, setProcessing] = useState(false);

  // Form state
  const [form, setForm] = useState({
    employee_id: '', goal_title: '', goal_description: '', goal_category: 'Clinical Quality',
    target_value: 100, weight: 25, due_date: '', created_by: '',
  });

  const loadData = useCallback(() => {
    try {
      setGoals(dataStore.getGoals());
      setEmployees(dataStore.getEmployees());
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeEmps = useMemo(() => employees.filter(e => e.employment_status === 'ACTIVE'), [employees]);
  const categories = useMemo(() => [...new Set(goals.map(g => g.goal_category))].sort(), [goals]);
  const goalEmployees = useMemo(() => [...new Set(goals.map(g => g.employee_name).filter(Boolean))].sort(), [goals]);

  const filtered = useMemo(() => {
    let g = goals;
    if (statusFilter !== 'all') g = g.filter(x => x.status === statusFilter);
    if (categoryFilter !== 'all') g = g.filter(x => x.goal_category === categoryFilter);
    if (employeeFilter !== 'all') g = g.filter(x => x.employee_name === employeeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      g = g.filter(x => x.goal_title.toLowerCase().includes(q) || (x.employee_name || '').toLowerCase().includes(q));
    }
    return g;
  }, [goals, statusFilter, categoryFilter, employeeFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: goals.length,
    completed: goals.filter(g => g.status === 'COMPLETED').length,
    inProgress: goals.filter(g => g.status === 'IN_PROGRESS').length,
    avgCompletion: goals.length > 0 ? Math.round(goals.reduce((s, g) => s + (g.target_value > 0 ? (g.current_value / g.target_value) * 100 : 0), 0) / goals.length) : 0,
  }), [goals]);

  // --- Create / Edit ---
  const openForm = useCallback((goal?: Goal) => {
    if (goal) {
      setForm({
        employee_id: goal.employee_id, goal_title: goal.goal_title,
        goal_description: goal.goal_description || '', goal_category: goal.goal_category,
        target_value: goal.target_value, weight: goal.weight || 25,
        due_date: goal.due_date || '', created_by: goal.created_by || '',
      });
      setEditGoal(goal);
    } else {
      setForm({ employee_id: '', goal_title: '', goal_description: '', goal_category: 'Clinical Quality', target_value: 100, weight: 25, due_date: '', created_by: '' });
      setEditGoal(null);
    }
    setShowForm(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.employee_id || !form.goal_title || !form.created_by.trim()) { toast.error('Fill required fields'); return; }
    setProcessing(true);
    const emp = activeEmps.find(e => e.id === form.employee_id);
    const empName = emp ? `${emp.first_name} ${emp.last_name}` : '';

    if (editGoal) {
      const ok = dataStore.updateGoal(editGoal.goal_id, {
        employee_id: form.employee_id, employee_name: empName,
        department: emp?.department_name, goal_title: form.goal_title,
        goal_description: form.goal_description || undefined, goal_category: form.goal_category,
        target_value: Number(form.target_value), weight: Number(form.weight),
        due_date: form.due_date || undefined, created_by: form.created_by,
      });
      if (ok) { toast.success('Goal updated'); setShowForm(false); setEditGoal(null); loadData(); }
      else toast.error('Failed');
    } else {
      const newId = `G-${String(goals.length + 1).padStart(3, '0')}`;
      const ok = dataStore.addGoal({
        goal_id: newId, employee_id: form.employee_id, employee_name: empName,
        department: emp?.department_name, cycle_id: 'PC-2025',
        goal_title: form.goal_title, goal_description: form.goal_description || undefined,
        goal_category: form.goal_category, target_value: Number(form.target_value),
        current_value: 0, completion_percentage: 0, weight: Number(form.weight),
        due_date: form.due_date || undefined, created_by: form.created_by,
        created_date: new Date().toISOString().split('T')[0], status: 'NOT_STARTED',
      });
      if (ok) { toast.success('Goal created — assigned to ' + empName); setShowForm(false); loadData(); }
      else toast.error('Failed');
    }
    setProcessing(false);
  }, [form, editGoal, activeEmps, goals.length, loadData]);

  // --- Update Progress ---
  const [progressValue, setProgressValue] = useState(0);
  const openProgress = useCallback((goal: Goal) => {
    setShowProgress(goal);
    setProgressValue(goal.current_value);
  }, []);

  const handleProgressSave = useCallback(() => {
    if (!showProgress) return;
    setProcessing(true);
    const pct = showProgress.target_value > 0 ? Math.min(100, Math.round((progressValue / showProgress.target_value) * 100)) : 0;
    const newStatus = pct >= 100 ? 'COMPLETED' : progressValue > 0 ? 'IN_PROGRESS' : showProgress.status;
    const ok = dataStore.updateGoal(showProgress.goal_id, {
      current_value: progressValue, completion_percentage: pct, status: newStatus,
    });
    if (ok) { toast.success('Progress updated'); setShowProgress(null); loadData(); }
    else toast.error('Failed');
    setProcessing(false);
  }, [showProgress, progressValue, loadData]);

  // --- Delete ---
  const handleDelete = useCallback(() => {
    if (!deleteGoal) return;
    setProcessing(true);
    const ok = dataStore.deleteGoal(deleteGoal.goal_id);
    if (ok) { toast.success('Goal deleted'); setDeleteGoal(null); loadData(); }
    else toast.error('Failed');
    setProcessing(false);
  }, [deleteGoal, loadData]);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto" /></div>;

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/performance"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Performance Goals</h2>
            <p className="page-description">Managers set goal plans for employees — track progress and completion</p>
          </div>
        </div>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2"><Plus size={16} /><span className="hidden sm:inline">Assign Goal</span></button>
      </div>

      {/* KPIs */}
      <div className="tibbna-grid-4 tibbna-section">
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Total Goals</p><p className="tibbna-card-value">{stats.total}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}><Target size={20} style={{ color: '#3B82F6' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Completed</p><p className="tibbna-card-value" style={{ color: '#10B981' }}>{stats.completed}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}><CheckCircle size={20} style={{ color: '#10B981' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">In Progress</p><p className="tibbna-card-value" style={{ color: '#F59E0B' }}>{stats.inProgress}</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}><Clock size={20} style={{ color: '#F59E0B' }} /></div></div></div></div>
        <div className="tibbna-card"><div className="tibbna-card-content"><div className="flex items-center justify-between"><div><p className="tibbna-card-title">Avg Completion</p><p className="tibbna-card-value" style={{ color: '#6366F1' }}>{stats.avgCompletion}%</p></div><div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}><TrendingUp size={20} style={{ color: '#6366F1' }} /></div></div></div></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 tibbna-section">
        <select className="tibbna-input" style={{ width: 'auto', fontSize: '12px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          <option value="COMPLETED">Completed</option><option value="IN_PROGRESS">In Progress</option>
          <option value="NOT_STARTED">Not Started</option><option value="CANCELLED">Cancelled</option>
        </select>
        <select className="tibbna-input" style={{ width: 'auto', fontSize: '12px' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {categories.map(c => (<option key={c} value={c}>{c}</option>))}
        </select>
        <select className="tibbna-input" style={{ width: 'auto', fontSize: '12px' }} value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
          <option value="all">All Employees</option>
          {goalEmployees.map(e => (<option key={e} value={e}>{e}</option>))}
        </select>
        <div className="relative" style={{ width: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
          <input className="tibbna-input" style={{ paddingLeft: '32px', fontSize: '12px' }} placeholder="Search goals…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
      </div>

      {/* Goals List */}
      <div className="space-y-3">
        {filtered.map(goal => {
          const pct = goal.target_value > 0 ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100)) : 0;
          const sc = STATUS_COLORS[goal.status] || { bg: '#F3F4F6', text: '#374151' };
          return (
            <div key={goal.goal_id} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span style={{ fontSize: '15px', fontWeight: 600 }}>{goal.goal_title}</span>
                      <span className="tibbna-badge" style={{ backgroundColor: sc.bg, color: sc.text, fontSize: '10px' }}>{goal.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: '12px', color: '#525252' }}>
                      <Link href={`/hr/employees/${goal.employee_id}`} style={{ color: '#618FF5', fontWeight: 500 }} className="hover:underline">{goal.employee_name}</Link>
                      <span>|</span><span>{goal.department || '-'}</span>
                      <span>|</span><span>{goal.goal_category}</span>
                      {goal.weight && <><span>|</span><span>Weight: {goal.weight}%</span></>}
                    </div>
                    {goal.goal_description && <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{goal.goal_description}</p>}
                    <div className="flex items-center gap-4 mt-1" style={{ fontSize: '11px', color: '#a3a3a3' }}>
                      {goal.due_date && <span>Due: {goal.due_date}</span>}
                      {goal.created_by && <span>Assigned by: {goal.created_by}</span>}
                    </div>
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1" style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 100 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444', borderRadius: '4px', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '36px' }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div style={{ textAlign: 'center', minWidth: '60px' }}>
                      <p style={{ fontSize: '24px', fontWeight: 700, color: pct >= 100 ? '#10B981' : '#111827' }}>{goal.current_value}</p>
                      <p style={{ fontSize: '11px', color: '#a3a3a3' }}>of {goal.target_value}</p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => openProgress(goal)} className="btn-secondary" style={{ padding: '3px 8px', fontSize: '10px' }} title="Update Progress"><TrendingUp size={12} /></button>
                      <button onClick={() => openForm(goal)} className="btn-secondary" style={{ padding: '3px 8px' }}><Pencil size={12} /></button>
                      <button onClick={() => setDeleteGoal(goal)} className="btn-secondary" style={{ padding: '3px 8px', color: '#DC2626' }}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="tibbna-card"><div className="tibbna-card-content" style={{ textAlign: 'center', padding: '32px', color: '#a3a3a3' }}>No goals match the current filters</div></div>
        )}
      </div>

      {/* Create / Edit Goal Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{editGoal ? 'Edit Goal' : 'Assign Goal to Employee'}</h3>
              <button onClick={() => { setShowForm(false); setEditGoal(null); }} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Employee *</label>
                <select className="tibbna-input" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })}>
                  <option value="">Select employee…</option>
                  {activeEmps.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.department_name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Goal Title *</label>
                <input className="tibbna-input" value={form.goal_title} onChange={e => setForm({ ...form, goal_title: e.target.value })} placeholder="e.g. Reduce readmission rate by 30%" />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Description</label>
                <textarea className="tibbna-input" rows={2} value={form.goal_description} onChange={e => setForm({ ...form, goal_description: e.target.value })} placeholder="Detailed description of the goal…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Category *</label>
                  <select className="tibbna-input" value={form.goal_category} onChange={e => setForm({ ...form, goal_category: e.target.value })}>
                    {GOAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Due Date</label>
                  <input className="tibbna-input" type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Target Value</label>
                  <input className="tibbna-input" type="number" value={form.target_value} onChange={e => setForm({ ...form, target_value: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Weight (%)</label>
                  <input className="tibbna-input" type="number" min={0} max={100} value={form.weight} onChange={e => setForm({ ...form, weight: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Assigned By (Manager) *</label>
                <input className="tibbna-input" value={form.created_by} onChange={e => setForm({ ...form, created_by: e.target.value })} placeholder="Manager name who sets this goal" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => { setShowForm(false); setEditGoal(null); }}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={processing || !form.employee_id || !form.goal_title || !form.created_by.trim()}>{processing ? 'Saving…' : editGoal ? 'Update' : 'Assign Goal'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Update Progress Modal */}
      {showProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Update Progress</h3>
              <button onClick={() => setShowProgress(null)} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <p style={{ fontSize: '14px', fontWeight: 600 }}>{showProgress.goal_title}</p>
              <p style={{ fontSize: '12px', color: '#525252' }}>{showProgress.employee_name}</p>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Current Value (target: {showProgress.target_value})</label>
                <input className="tibbna-input" type="number" value={progressValue} onChange={e => setProgressValue(Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1" style={{ height: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                  <div style={{ width: `${Math.min(100, showProgress.target_value > 0 ? Math.round((progressValue / showProgress.target_value) * 100) : 0)}%`, height: '100%', backgroundColor: progressValue >= showProgress.target_value ? '#10B981' : '#F59E0B', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>{showProgress.target_value > 0 ? Math.min(100, Math.round((progressValue / showProgress.target_value) * 100)) : 0}%</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setShowProgress(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleProgressSave} disabled={processing}>{processing ? 'Saving…' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 text-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><AlertTriangle size={24} style={{ color: '#DC2626' }} /></div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Delete Goal?</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>Remove <strong>{deleteGoal.goal_title}</strong> for <strong>{deleteGoal.employee_name}</strong>?</p>
            </div>
            <div className="flex justify-center gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setDeleteGoal(null)}>Cancel</button>
              <button className="btn-primary" style={{ backgroundColor: '#DC2626' }} onClick={handleDelete} disabled={processing}>{processing ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
