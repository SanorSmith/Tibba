'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2, Users, MapPin, Phone, Plus, Pencil, Trash2, Eye,
  X, Search, RotateCcw, AlertTriangle
} from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { toast } from 'sonner';
import type { Employee, Department } from '@/types/hr';

// ============================================================================
// CONSTANTS
// ============================================================================
const TYPE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  CLINICAL:       { bg: '#DBEAFE', text: '#1D4ED8', accent: '#3B82F6' },
  ADMINISTRATIVE: { bg: '#E0E7FF', text: '#4338CA', accent: '#6366F1' },
  SUPPORT:        { bg: '#FEF3C7', text: '#92400E', accent: '#F59E0B' },
};

const DEPT_TYPES: Department['type'][] = ['CLINICAL', 'ADMINISTRATIVE', 'SUPPORT'];

const EMPTY_FORM: Omit<Department, 'id'> = {
  code: '', name: '', name_arabic: '', type: 'CLINICAL',
  head_employee_id: '', location: '', phone_ext: '',
  budget_annual: 0, is_active: true,
};

export default function OrganizationPage() {
  // =========================================================================
  // STATE
  // =========================================================================
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showDetail, setShowDetail] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [processing, setProcessing] = useState(false);

  // =========================================================================
  // LOAD DATA
  // =========================================================================
  const loadData = useCallback(() => {
    try {
      setDepartments(dataStore.getDepartments());
      setEmployees(dataStore.getEmployees());
    } catch (err) {
      console.error('Error loading departments:', err);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // =========================================================================
  // DERIVED
  // =========================================================================
  const getEmp = useCallback(
    (id?: string) => id ? employees.find(e => e.id === id) : undefined,
    [employees]
  );

  const headcount = useCallback(
    (deptId: string) => employees.filter(e => e.department_id === deptId && e.employment_status === 'ACTIVE').length,
    [employees]
  );

  const filtered = useMemo(() => {
    let list = departments;
    if (typeFilter !== 'all') list = list.filter(d => d.type === typeFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.name_arabic || '').includes(q) ||
        (d.code || '').toLowerCase().includes(q) ||
        (d.location || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [departments, typeFilter, searchQuery]);

  const grouped = useMemo(() => ({
    CLINICAL:       filtered.filter(d => d.type === 'CLINICAL'),
    ADMINISTRATIVE: filtered.filter(d => d.type === 'ADMINISTRATIVE'),
    SUPPORT:        filtered.filter(d => d.type === 'SUPPORT'),
  }), [filtered]);

  const hasFilters = typeFilter !== 'all' || searchQuery.trim() !== '';

  // =========================================================================
  // FORM HANDLERS
  // =========================================================================
  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
  };

  const openEdit = (dept: Department) => {
    setEditingId(dept.id);
    setForm({
      code: dept.code || '',
      name: dept.name,
      name_arabic: dept.name_arabic || '',
      type: dept.type,
      head_employee_id: dept.head_employee_id || '',
      location: dept.location || '',
      phone_ext: dept.phone_ext || '',
      budget_annual: dept.budget_annual || 0,
      is_active: dept.is_active !== false,
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingId(null); setForm({ ...EMPTY_FORM }); };

  const handleSave = useCallback(() => {
    if (!form.name.trim() || !form.code?.trim()) {
      toast.error('Name and Code are required');
      return;
    }
    setProcessing(true);
    try {
      if (editingId) {
        const ok = dataStore.updateDepartment(editingId, form as Partial<Department>);
        if (ok) { toast.success('Department updated'); closeForm(); loadData(); }
        else toast.error('Failed to update');
      } else {
        const newId = `DEP-${String(departments.length + 1).padStart(3, '0')}`;
        const ok = dataStore.addDepartment({ id: newId, ...form } as Department);
        if (ok) { toast.success('Department created', { description: `ID: ${newId}` }); closeForm(); loadData(); }
        else toast.error('Failed to create');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Error saving department');
    } finally {
      setProcessing(false);
    }
  }, [editingId, form, departments.length, loadData]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    const count = headcount(deleteTarget.id);
    if (count > 0) {
      toast.error(`Cannot delete: ${count} active employee(s) assigned`);
      setDeleteTarget(null);
      return;
    }
    setProcessing(true);
    try {
      const ok = dataStore.deleteDepartment(deleteTarget.id);
      if (ok) { toast.success('Department deleted'); setDeleteTarget(null); loadData(); }
      else toast.error('Failed to delete');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Error deleting department');
    } finally {
      setProcessing(false);
    }
  }, [deleteTarget, headcount, loadData]);

  const updateField = (key: string, value: string | number | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  // =========================================================================
  // RENDER
  // =========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto mb-3" />
          <p style={{ fontSize: '13px', color: '#a3a3a3' }}>Loading departments…</p>
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
        <div className="flex items-center gap-3">
          <div>
            <h2 className="page-title">Organizational Structure</h2>
            <p className="page-description">{departments.length} departments across the hospital</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/hr/organization/chart">
            <button className="btn-secondary flex items-center gap-1.5"><Building2 size={15} /> Org Chart</button>
          </Link>
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus size={15} /> New Department
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* KPI CARDS                                                         */}
      {/* ================================================================= */}
      <div className="tibbna-grid-3 tibbna-section">
        {([
          { label: 'Clinical Departments', count: departments.filter(d => d.type === 'CLINICAL').length, type: 'CLINICAL' as const },
          { label: 'Administrative', count: departments.filter(d => d.type === 'ADMINISTRATIVE').length, type: 'ADMINISTRATIVE' as const },
          { label: 'Support Services', count: departments.filter(d => d.type === 'SUPPORT').length, type: 'SUPPORT' as const },
        ]).map(kpi => {
          const tc = TYPE_COLORS[kpi.type];
          return (
            <div key={kpi.type} className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>{kpi.label}</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: tc.accent }}>{kpi.count}</p>
                  </div>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={22} style={{ color: tc.accent }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================================================================= */}
      {/* FILTERS                                                           */}
      {/* ================================================================= */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#a3a3a3' }} />
              <input
                className="tibbna-input"
                style={{ paddingLeft: '32px' }}
                placeholder="Search departments…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select className="tibbna-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Types</option>
              {DEPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {hasFilters && (
              <button className="btn-secondary flex items-center gap-1 justify-center" onClick={() => { setTypeFilter('all'); setSearchQuery(''); }}>
                <RotateCcw size={13} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* DEPARTMENT GROUPS                                                 */}
      {/* ================================================================= */}
      {([
        { title: 'Clinical Departments', key: 'CLINICAL' as const },
        { title: 'Administrative Departments', key: 'ADMINISTRATIVE' as const },
        { title: 'Support Services', key: 'SUPPORT' as const },
      ]).filter(g => grouped[g.key].length > 0).map(group => (
        <div key={group.key} className="tibbna-section">
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#374151', marginBottom: '12px' }}>{group.title}</h3>
          <div className="tibbna-grid-3">
            {grouped[group.key].map(dept => {
              const hc = headcount(dept.id);
              const head = getEmp(dept.head_employee_id);
              const tc = TYPE_COLORS[dept.type] || { bg: '#F3F4F6', text: '#374151', accent: '#6B7280' };
              return (
                <div key={dept.id} className="tibbna-card" style={{ position: 'relative' }}>
                  <div className="tibbna-card-content">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{dept.name}</h4>
                        {dept.name_arabic && <p style={{ fontSize: '12px', color: '#a3a3a3', direction: 'rtl' }}>{dept.name_arabic}</p>}
                      </div>
                      <span className="tibbna-badge" style={{ backgroundColor: tc.bg, color: tc.text, fontSize: '10px', flexShrink: 0 }}>{dept.type}</span>
                    </div>

                    {/* Info */}
                    <div style={{ fontSize: '12px', color: '#525252', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div className="flex items-center gap-2"><Users size={12} /> <span>{hc} staff</span></div>
                      {dept.location && <div className="flex items-center gap-2"><MapPin size={12} /> <span>{dept.location}</span></div>}
                      {dept.phone_ext && <div className="flex items-center gap-2"><Phone size={12} /> <span>Ext. {dept.phone_ext}</span></div>}
                      {head && (
                        <div style={{ marginTop: '6px', padding: '6px 8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                          <p style={{ fontSize: '11px', color: '#a3a3a3' }}>Department Head</p>
                          <p style={{ fontSize: '13px', fontWeight: 500 }}>{head.first_name} {head.last_name}</p>
                          <p style={{ fontSize: '11px', color: '#525252' }}>{head.job_title}</p>
                        </div>
                      )}
                      <div className="flex justify-between mt-2" style={{ fontSize: '11px', color: '#a3a3a3' }}>
                        <span>Budget: {((dept.budget_annual || 0) / 1000000000).toFixed(1)}B IQD</span>
                        <span>Code: {dept.code}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 mt-3 pt-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                      <button
                        onClick={() => setShowDetail(dept)}
                        className="btn-secondary flex items-center gap-1"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        onClick={() => openEdit(dept)}
                        className="btn-secondary flex items-center gap-1"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(dept)}
                        className="btn-secondary flex items-center gap-1"
                        style={{ fontSize: '11px', padding: '4px 10px', color: '#DC2626' }}
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="tibbna-card">
          <div className="tibbna-card-content" style={{ textAlign: 'center', padding: '48px' }}>
            <Building2 size={40} style={{ color: '#D1D5DB', margin: '0 auto 12px' }} />
            <p style={{ color: '#6B7280', fontSize: '13px' }}>No departments found</p>
            {hasFilters && (
              <button onClick={() => { setTypeFilter('all'); setSearchQuery(''); }} style={{ color: '#618FF5', fontSize: '12px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', marginTop: '8px' }}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* VIEW DETAIL MODAL                                                 */}
      {/* ================================================================= */}
      {showDetail && (() => {
        const dept = showDetail;
        const hc = headcount(dept.id);
        const head = getEmp(dept.head_employee_id);
        const tc = TYPE_COLORS[dept.type] || { bg: '#F3F4F6', text: '#374151', accent: '#6B7280' };
        const deptEmployees = employees.filter(e => e.department_id === dept.id && e.employment_status === 'ACTIVE');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{dept.name}</h3>
                  {dept.name_arabic && <p style={{ fontSize: '12px', color: '#a3a3a3', direction: 'rtl' }}>{dept.name_arabic}</p>}
                </div>
                <button onClick={() => setShowDetail(null)} style={{ color: '#a3a3a3' }}><X size={16} /></button>
              </div>
              <div className="px-5 py-4 space-y-4">
                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3" style={{ fontSize: '12px' }}>
                  <div><p style={{ color: '#6B7280' }}>Type</p><span className="tibbna-badge" style={{ backgroundColor: tc.bg, color: tc.text, fontSize: '10px' }}>{dept.type}</span></div>
                  <div><p style={{ color: '#6B7280' }}>Code</p><p style={{ fontWeight: 600 }}>{dept.code || '-'}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Location</p><p style={{ fontWeight: 600 }}>{dept.location || '-'}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Phone Ext.</p><p style={{ fontWeight: 600 }}>{dept.phone_ext || '-'}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Annual Budget</p><p style={{ fontWeight: 600 }}>{((dept.budget_annual || 0) / 1000000).toFixed(0)}M IQD</p></div>
                  <div><p style={{ color: '#6B7280' }}>Active Staff</p><p style={{ fontWeight: 600 }}>{hc}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Status</p><p style={{ fontWeight: 600, color: dept.is_active !== false ? '#059669' : '#DC2626' }}>{dept.is_active !== false ? 'Active' : 'Inactive'}</p></div>
                </div>

                {/* Department Head */}
                {head && (
                  <div style={{ padding: '10px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: '#0369A1', marginBottom: '4px' }}>Department Head</p>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{head.first_name} {head.last_name}</p>
                    <p style={{ fontSize: '11px', color: '#6B7280' }}>{head.job_title}</p>
                  </div>
                )}

                {/* Staff list */}
                {deptEmployees.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Staff ({deptEmployees.length})</p>
                    <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e4e4e4', borderRadius: '6px' }}>
                      {deptEmployees.map(emp => (
                        <div key={emp.id} className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid #f0f0f0', fontSize: '12px' }}>
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#DBEAFE',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9px', fontWeight: 600, color: '#2563EB', flexShrink: 0,
                          }}>
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontWeight: 600 }}>{emp.first_name} {emp.last_name}</p>
                            <p style={{ fontSize: '10px', color: '#6B7280' }}>{emp.job_title}</p>
                          </div>
                          <span style={{ fontSize: '10px', color: '#a3a3a3' }}>{emp.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
                <button className="btn-secondary" onClick={() => { setShowDetail(null); openEdit(dept); }}>
                  <Pencil size={12} className="inline mr-1" /> Edit
                </button>
                <button className="btn-secondary" onClick={() => setShowDetail(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* CREATE / EDIT MODAL                                               */}
      {/* ================================================================= */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{editingId ? 'Edit Department' : 'New Department'}</h3>
              <button onClick={closeForm} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-4">
              {/* Name */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Department Name <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input className="tibbna-input" value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g. Cardiology" />
              </div>
              {/* Arabic name */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Name (Arabic)</label>
                <input className="tibbna-input" value={form.name_arabic || ''} onChange={e => updateField('name_arabic', e.target.value)} placeholder="e.g. أمراض القلب" style={{ direction: 'rtl' }} />
              </div>
              {/* Code + Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                    Code <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input className="tibbna-input" value={form.code || ''} onChange={e => updateField('code', e.target.value.toUpperCase())} placeholder="e.g. CARD" maxLength={6} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Type</label>
                  <select className="tibbna-input" value={form.type} onChange={e => updateField('type', e.target.value)}>
                    {DEPT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              {/* Head */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Department Head</label>
                <select className="tibbna-input" value={form.head_employee_id || ''} onChange={e => updateField('head_employee_id', e.target.value)}>
                  <option value="">None</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name} — {e.job_title}</option>)}
                </select>
              </div>
              {/* Location + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Location</label>
                  <input className="tibbna-input" value={form.location || ''} onChange={e => updateField('location', e.target.value)} placeholder="Building A, 2nd Floor" />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Phone Ext.</label>
                  <input className="tibbna-input" value={form.phone_ext || ''} onChange={e => updateField('phone_ext', e.target.value)} placeholder="200" />
                </div>
              </div>
              {/* Budget */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Annual Budget (IQD)</label>
                <input type="number" className="tibbna-input" value={form.budget_annual || 0} onChange={e => updateField('budget_annual', Number(e.target.value))} />
              </div>
              {/* Active */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="dept-active" checked={form.is_active !== false} onChange={e => updateField('is_active', e.target.checked)} />
                <label htmlFor="dept-active" style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Active</label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={closeForm} disabled={processing}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={processing || !form.name.trim() || !form.code?.trim()}>
                {processing ? 'Saving…' : editingId ? 'Update Department' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DELETE CONFIRMATION                                               */}
      {/* ================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="px-5 py-4 text-center">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <AlertTriangle size={24} style={{ color: '#DC2626' }} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>Delete Department?</h3>
              <p style={{ fontSize: '12px', color: '#6B7280' }}>
                Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
                {headcount(deleteTarget.id) > 0 && (
                  <span style={{ display: 'block', color: '#DC2626', fontWeight: 600, marginTop: '4px' }}>
                    This department has {headcount(deleteTarget.id)} active employee(s) and cannot be deleted.
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)} disabled={processing}>Cancel</button>
              <button
                className="btn-primary"
                style={{ backgroundColor: '#DC2626' }}
                onClick={handleDelete}
                disabled={processing || headcount(deleteTarget.id) > 0}
              >
                {processing ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
