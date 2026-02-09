'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Download, Plus, Users, Calendar, TrendingUp, CheckCircle,
  RotateCcw, X, AlertTriangle
} from 'lucide-react';
import { dataStore } from '@/lib/dataStore';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Employee } from '@/types/hr';

// ============================================================================
// TYPES
// ============================================================================
interface BalanceBucket {
  total: number;
  used: number;
  pending?: number;
  available: number;
}

interface RawBalance {
  employee_id: string;
  employee_name?: string;
  [key: string]: BalanceBucket | string | undefined;
}

interface BalanceRow {
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: string;
  typeKey: string;
  total: number;
  used: number;
  pending: number;
  available: number;
  percentage: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================
const LEAVE_TYPE_MAP: Record<string, string> = {
  annual:       'Annual Leave',
  sick:         'Sick Leave',
  emergency:    'Emergency Leave',
  maternity:    'Maternity Leave',
  paternity:    'Paternity Leave',
  compensatory: 'Compensatory Leave',
  study:        'Study Leave',
  hajj:         'Hajj Leave',
};

const REVERSE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LEAVE_TYPE_MAP).map(([k, v]) => [v, k])
);

const ADJUSTABLE_TYPES = [
  'Annual Leave', 'Sick Leave', 'Emergency Leave',
  'Maternity Leave', 'Paternity Leave', 'Compensatory Leave', 'Study Leave',
];

const TYPE_COLORS: Record<string, string> = {
  'Annual Leave':       '#3B82F6',
  'Sick Leave':         '#EF4444',
  'Emergency Leave':    '#F59E0B',
  'Maternity Leave':    '#EC4899',
  'Paternity Leave':    '#8B5CF6',
  'Compensatory Leave': '#22C55E',
  'Study Leave':        '#0EA5E9',
  'Hajj Leave':         '#059669',
};

export default function LeaveBalancesPage() {
  const { hasRole } = useAuth();
  const isHR = hasRole(['HR_ADMIN', 'Administrator']);

  // =========================================================================
  // STATE
  // =========================================================================
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [rawBalances, setRawBalances] = useState<RawBalance[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjEmpId, setAdjEmpId] = useState('');
  const [adjType, setAdjType] = useState('');
  const [adjAmount, setAdjAmount] = useState<number>(0);
  const [adjReason, setAdjReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // =========================================================================
  // LOAD DATA
  // =========================================================================
  const loadData = useCallback(() => {
    try {
      setEmployees(dataStore.getEmployees());
      const bals = dataStore.getLeaveBalances() as unknown as RawBalance[];
      setRawBalances(bals);
    } catch (err) {
      console.error('Error loading balances:', err);
      toast.error('Failed to load leave balances');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // =========================================================================
  // DERIVED
  // =========================================================================
  const getEmp = useCallback(
    (id: string) => employees.find(e => e.id === id),
    [employees]
  );

  const departments = useMemo(
    () => [...new Set(employees.map(e => e.department_name).filter(Boolean))].sort(),
    [employees]
  );

  const discoveredTypes = useMemo(() => {
    const types = new Set<string>();
    rawBalances.forEach(bal => {
      Object.keys(bal).forEach(k => {
        if (k !== 'employee_id' && k !== 'employee_name' && LEAVE_TYPE_MAP[k]) {
          types.add(LEAVE_TYPE_MAP[k]);
        }
      });
    });
    return [...types].sort();
  }, [rawBalances]);

  // =========================================================================
  // BALANCE ROWS
  // =========================================================================
  const balanceRows = useMemo((): BalanceRow[] => {
    const rows: BalanceRow[] = [];

    rawBalances.forEach(bal => {
      const emp = getEmp(bal.employee_id);
      if (!emp) return;
      if (employeeFilter !== 'all' && bal.employee_id !== employeeFilter) return;
      if (departmentFilter !== 'all' && emp.department_name !== departmentFilter) return;

      Object.entries(LEAVE_TYPE_MAP).forEach(([typeKey, typeName]) => {
        if (typeFilter !== 'all' && typeName !== typeFilter) return;

        const bucket = bal[typeKey] as BalanceBucket | undefined;
        if (!bucket || typeof bucket !== 'object') return;

        const total = bucket.total || 0;
        const used = bucket.used || 0;
        const pending = bucket.pending || 0;
        const available = bucket.available || 0;
        const percentage = total > 0 ? ((used + pending) / total) * 100 : 0;

        rows.push({
          employeeId: bal.employee_id,
          employeeName: `${emp.first_name} ${emp.last_name}`,
          department: emp.department_name,
          leaveType: typeName,
          typeKey,
          total, used, pending, available, percentage,
        });
      });
    });

    return rows.sort((a, b) => {
      const n = a.employeeName.localeCompare(b.employeeName);
      return n !== 0 ? n : a.leaveType.localeCompare(b.leaveType);
    });
  }, [rawBalances, employees, departmentFilter, employeeFilter, typeFilter, getEmp]);

  const hasActiveFilters = departmentFilter !== 'all' || employeeFilter !== 'all' || typeFilter !== 'all';
  const clearFilters = () => { setDepartmentFilter('all'); setEmployeeFilter('all'); setTypeFilter('all'); };

  // =========================================================================
  // STATISTICS
  // =========================================================================
  const stats = useMemo(() => {
    const empIds = new Set(balanceRows.map(r => r.employeeId));
    const totBal = balanceRows.reduce((s, r) => s + r.total, 0);
    const totUsed = balanceRows.reduce((s, r) => s + r.used, 0);
    const totPending = balanceRows.reduce((s, r) => s + r.pending, 0);
    const totAvail = balanceRows.reduce((s, r) => s + r.available, 0);
    return {
      employees: empIds.size,
      totalDays: totBal,
      used: totUsed,
      pending: totPending,
      available: totAvail,
      utilization: totBal > 0 ? ((totUsed / totBal) * 100).toFixed(1) : '0.0',
    };
  }, [balanceRows]);

  // =========================================================================
  // CSV EXPORT
  // =========================================================================
  const handleExportCSV = useCallback(() => {
    try {
      const headers = ['Employee ID', 'Employee Name', 'Department', 'Leave Type', 'Total', 'Used', 'Pending', 'Available', 'Utilization %'];
      const csvRows = balanceRows.map(r => [
        r.employeeId, r.employeeName, r.department, r.leaveType,
        r.total, r.used, r.pending, r.available, r.percentage.toFixed(1) + '%',
      ]);
      const csv = [headers.join(','), ...csvRows.map(row => row.map(c => `"${c}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leave_balances_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Balances exported', { description: `${balanceRows.length} rows` });
    } catch {
      toast.error('Export failed');
    }
  }, [balanceRows]);

  // =========================================================================
  // BALANCE ADJUSTMENT
  // =========================================================================
  const resetAdjustForm = () => { setAdjEmpId(''); setAdjType(''); setAdjAmount(0); setAdjReason(''); setShowAdjustModal(false); };

  const handleAdjust = useCallback(async () => {
    if (!isHR) { toast.error('Only HR can adjust balances'); return; }
    if (!adjEmpId || !adjType || adjAmount === 0 || !adjReason.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    setProcessing(true);
    try {
      const typeKey = REVERSE_MAP[adjType];
      if (!typeKey) { toast.error('Invalid leave type'); setProcessing(false); return; }

      const balance = dataStore.getRawLeaveBalance(adjEmpId);
      if (!balance) { toast.error('Employee balance not found'); setProcessing(false); return; }

      const bucket = (balance as Record<string, BalanceBucket>)[typeKey];
      if (!bucket) { toast.error(`No ${adjType} balance found for this employee`); setProcessing(false); return; }

      const newTotal = Math.max(0, (bucket.total || 0) + adjAmount);
      const newAvailable = Math.max(0, (bucket.available || 0) + adjAmount);

      const ok = dataStore.updateLeaveBalanceByType(adjEmpId, typeKey, { total: newTotal, available: newAvailable });
      if (ok) {
        toast.success('Balance adjusted', {
          description: `${adjAmount > 0 ? '+' : ''}${adjAmount} day(s) ${adjType} for ${getEmp(adjEmpId)?.first_name || adjEmpId}`,
        });
        resetAdjustForm();
        loadData();
      } else {
        toast.error('Failed to update balance');
      }
    } catch (err) {
      console.error('Adjustment error:', err);
      toast.error('Error adjusting balance');
    } finally {
      setProcessing(false);
    }
  }, [isHR, adjEmpId, adjType, adjAmount, adjReason, getEmp, loadData]);

  // =========================================================================
  // HELPERS
  // =========================================================================
  const barColor = (pct: number) => {
    if (pct >= 80) return '#EF4444';
    if (pct >= 60) return '#F59E0B';
    return '#10B981';
  };

  // =========================================================================
  // RENDER
  // =========================================================================
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#618FF5] border-t-transparent mx-auto mb-3" />
          <p style={{ fontSize: '13px', color: '#a3a3a3' }}>Loading balances…</p>
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
          <Link href="/hr/leaves"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Leave Balances</h2>
            <p className="page-description">Manage employee leave entitlements and adjustments</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isHR && (
            <button onClick={() => setShowAdjustModal(true)} className="btn-secondary flex items-center gap-1.5">
              <Plus size={15} /> Adjust Balance
            </button>
          )}
          <button onClick={handleExportCSV} className="btn-primary flex items-center gap-1.5">
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* KPI CARDS                                                         */}
      {/* ================================================================= */}
      <div className="tibbna-grid-4 tibbna-section">
        {[
          { label: 'Employees', value: stats.employees, sub: 'with balances', icon: Users, iconBg: '#EEF2FF', iconColor: '#4F46E5' },
          { label: 'Total Entitlement', value: `${stats.totalDays}`, sub: 'days', icon: Calendar, iconBg: '#DBEAFE', iconColor: '#2563EB' },
          { label: 'Used', value: `${stats.used}`, sub: `${stats.pending} pending`, icon: TrendingUp, iconBg: '#FEE2E2', iconColor: '#DC2626' },
          { label: 'Available', value: `${stats.available}`, sub: `${stats.utilization}% utilized`, icon: CheckCircle, iconBg: '#D1FAE5', iconColor: '#059669' },
        ].map(kpi => (
          <div key={kpi.label} className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', marginBottom: '4px' }}>{kpi.label}</p>
                  <p style={{ fontSize: '22px', fontWeight: 700, color: '#111827' }}>{kpi.value}</p>
                  <p style={{ fontSize: '11px', color: '#6B7280' }}>{kpi.sub}</p>
                </div>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: kpi.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <kpi.icon size={22} style={{ color: kpi.iconColor }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ================================================================= */}
      {/* FILTERS                                                           */}
      {/* ================================================================= */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-content">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select className="tibbna-input" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="tibbna-input" value={employeeFilter} onChange={e => setEmployeeFilter(e.target.value)}>
              <option value="all">All Employees</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
            <select className="tibbna-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="all">All Leave Types</option>
              {discoveredTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {hasActiveFilters && (
              <button className="btn-secondary flex items-center gap-1 justify-center" onClick={clearFilters}>
                <RotateCcw size={13} /> Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* BALANCES TABLE                                                    */}
      {/* ================================================================= */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-card-title">Balance Details</h3>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>{balanceRows.length} record(s)</span>
        </div>
        <div className="tibbna-card-content" style={{ padding: 0 }}>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="tibbna-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Leave Type</th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Used</th>
                  <th style={{ textAlign: 'center' }}>Pending</th>
                  <th style={{ textAlign: 'center' }}>Available</th>
                  <th style={{ minWidth: '140px' }}>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {balanceRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#a3a3a3' }}>
                      No balance records found
                      {hasActiveFilters && (
                        <button onClick={clearFilters} style={{ display: 'block', margin: '8px auto 0', color: '#618FF5', fontSize: '12px', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                          Clear Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : balanceRows.map((row, i) => (
                  <tr key={`${row.employeeId}-${row.typeKey}-${i}`}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#DBEAFE',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 600, color: '#2563EB', flexShrink: 0,
                        }}>
                          {row.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600 }}>{row.employeeName}</p>
                          <p style={{ fontSize: '10px', color: '#6B7280' }}>{row.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#374151' }}>{row.department}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: TYPE_COLORS[row.leaveType] || '#6B7280' }} />
                        <span style={{ fontSize: '12px', color: '#374151' }}>{row.leaveType}</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>{row.total}</td>
                    <td style={{ textAlign: 'center', fontSize: '13px', color: '#DC2626' }}>{row.used}</td>
                    <td style={{ textAlign: 'center', fontSize: '13px', color: '#F59E0B' }}>{row.pending}</td>
                    <td style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#059669' }}>{row.available}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(row.percentage, 100)}%`, backgroundColor: barColor(row.percentage), transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280', width: '32px', textAlign: 'right' }}>
                          {row.percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden p-4 space-y-3">
            {balanceRows.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#a3a3a3', padding: '24px' }}>No records found</p>
            ) : balanceRows.map((row, i) => (
              <div key={`m-${row.employeeId}-${row.typeKey}-${i}`} style={{ border: '1px solid #e4e4e4', borderRadius: '8px', padding: '12px' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#DBEAFE',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 600, color: '#2563EB',
                    }}>
                      {row.employeeName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 600 }}>{row.employeeName}</p>
                      <p style={{ fontSize: '10px', color: '#6B7280' }}>{row.department}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div style={{ width: '6px', height: '6px', borderRadius: '2px', backgroundColor: TYPE_COLORS[row.leaveType] || '#6B7280' }} />
                    <span style={{ fontSize: '10px', color: '#374151' }}>{row.leaveType}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2" style={{ fontSize: '11px', textAlign: 'center' }}>
                  <div><p style={{ color: '#6B7280' }}>Total</p><p style={{ fontWeight: 600 }}>{row.total}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Used</p><p style={{ fontWeight: 600, color: '#DC2626' }}>{row.used}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Pending</p><p style={{ fontWeight: 600, color: '#F59E0B' }}>{row.pending}</p></div>
                  <div><p style={{ color: '#6B7280' }}>Avail</p><p style={{ fontWeight: 600, color: '#059669' }}>{row.available}</p></div>
                </div>
                <div className="flex items-center gap-2">
                  <div style={{ flex: 1, height: '5px', borderRadius: '3px', backgroundColor: '#E5E7EB', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: '3px', width: `${Math.min(row.percentage, 100)}%`, backgroundColor: barColor(row.percentage) }} />
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#6B7280' }}>{row.percentage.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* ADJUST BALANCE MODAL                                              */}
      {/* ================================================================= */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid #e4e4e4' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Adjust Leave Balance</h3>
              <button onClick={resetAdjustForm} style={{ color: '#a3a3a3' }}><X size={16} /></button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              {/* Employee */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Employee <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select className="tibbna-input" value={adjEmpId} onChange={e => setAdjEmpId(e.target.value)}>
                  <option value="">Select employee…</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
                </select>
              </div>

              {/* Leave type */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Leave Type <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select className="tibbna-input" value={adjType} onChange={e => setAdjType(e.target.value)}>
                  <option value="">Select leave type…</option>
                  {ADJUSTABLE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Current balance preview */}
              {adjEmpId && adjType && (() => {
                const bal = dataStore.getRawLeaveBalance(adjEmpId);
                const key = REVERSE_MAP[adjType];
                const bucket = bal && key ? (bal as Record<string, BalanceBucket>)[key] : null;
                if (!bucket) return null;
                return (
                  <div style={{ padding: '10px', backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '8px', fontSize: '12px' }}>
                    <p style={{ fontWeight: 600, color: '#0369A1', marginBottom: '4px' }}>Current Balance</p>
                    <div className="grid grid-cols-4 gap-2" style={{ textAlign: 'center' }}>
                      <div><p style={{ color: '#6B7280' }}>Total</p><p style={{ fontWeight: 700 }}>{bucket.total || 0}</p></div>
                      <div><p style={{ color: '#6B7280' }}>Used</p><p style={{ fontWeight: 700, color: '#DC2626' }}>{bucket.used || 0}</p></div>
                      <div><p style={{ color: '#6B7280' }}>Pending</p><p style={{ fontWeight: 700, color: '#F59E0B' }}>{bucket.pending || 0}</p></div>
                      <div><p style={{ color: '#6B7280' }}>Avail</p><p style={{ fontWeight: 700, color: '#059669' }}>{bucket.available || 0}</p></div>
                    </div>
                  </div>
                );
              })()}

              {/* Amount */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Adjustment (days) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="number"
                  className="tibbna-input"
                  value={adjAmount}
                  onChange={e => setAdjAmount(Number(e.target.value))}
                  placeholder="e.g. 5 or -3"
                />
                <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '3px' }}>
                  Positive to add days, negative to deduct
                </p>
              </div>

              {/* Preview impact */}
              {adjAmount !== 0 && (
                <div style={{
                  padding: '8px 12px', borderRadius: '6px',
                  backgroundColor: adjAmount > 0 ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${adjAmount > 0 ? '#BBF7D0' : '#FECACA'}`,
                  fontSize: '12px', color: adjAmount > 0 ? '#166534' : '#991B1B',
                }}>
                  <div className="flex items-center gap-1.5">
                    {adjAmount > 0 ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                    <span style={{ fontWeight: 600 }}>
                      {adjAmount > 0 ? `+${adjAmount} day(s) will be added` : `${adjAmount} day(s) will be deducted`}
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>
                  Reason <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  className="tibbna-input"
                  rows={3}
                  value={adjReason}
                  onChange={e => setAdjReason(e.target.value)}
                  placeholder="Explain the reason for this adjustment…"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: '1px solid #e4e4e4', backgroundColor: '#f9fafb', borderRadius: '0 0 12px 12px' }}>
              <button className="btn-secondary" onClick={resetAdjustForm} disabled={processing}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleAdjust}
                disabled={processing || !adjEmpId || !adjType || adjAmount === 0 || !adjReason.trim()}
              >
                {processing ? 'Adjusting…' : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
