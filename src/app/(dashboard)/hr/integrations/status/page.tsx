'use client';

import { useState, useEffect } from 'react';
import { Workflow, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function IntegrationsStatusPage() {
  const [pending, setPending] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    loadPendingIntegrations();
  }, []);

  const loadPendingIntegrations = async () => {
    try {
      const { integrationManager } = await import('@/lib/integrationManager');
      const data = integrationManager.getPendingIntegrations();
      setPending(data);
      setTotalPending(integrationManager.getPendingCount());
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearPending = async () => {
    if (!confirm('Clear all pending integration actions? This cannot be undone.')) return;

    const { integrationManager } = await import('@/lib/integrationManager');
    integrationManager.clearPendingIntegrations();
    loadPendingIntegrations();
    toast.success('All pending integrations cleared');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 200px)', paddingTop: '96px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 mx-auto mb-4" style={{ border: '3px solid #f3f4f6', borderTopColor: '#618FF5' }}></div>
          <p style={{ color: '#6B7280' }}>Loading integrations...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div>
          <h1 className="page-title">System Integrations</h1>
          <p className="page-description">Cross-module data flows and automation status</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadPendingIntegrations}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          {totalPending > 0 && (
            <button
              onClick={handleClearPending}
              className="btn-secondary flex items-center gap-2"
            >
              Clear Pending
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="tibbna-grid-4 mb-6">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Active Flows</p>
                <p className="text-2xl font-bold" style={{ color: '#111827' }}>4</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Auto-integrations</p>
              </div>
              <Workflow size={32} style={{ color: '#2563EB' }} />
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Pending Actions</p>
                <p className="text-2xl font-bold" style={{ color: totalPending > 0 ? '#F59E0B' : '#059669' }}>
                  {totalPending}
                </p>
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  {totalPending > 0 ? 'Awaiting processing' : 'All synced'}
                </p>
              </div>
              {totalPending > 0 ? (
                <Clock size={32} style={{ color: '#F59E0B' }} />
              ) : (
                <CheckCircle size={32} style={{ color: '#059669' }} />
              )}
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Status</p>
                <p className="text-2xl font-bold" style={{ color: '#059669' }}>OK</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>All systems operational</p>
              </div>
              <CheckCircle size={32} style={{ color: '#059669' }} />
            </div>
          </div>
        </div>

        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#6B7280' }}>Errors</p>
                <p className="text-2xl font-bold" style={{ color: '#6B7280' }}>0</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>No issues</p>
              </div>
              <AlertCircle size={32} style={{ color: '#6B7280' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Flows */}
      <div className="tibbna-card mb-6">
        <div className="tibbna-card-header">
          <h3 className="tibbna-card-title">Active Data Flows</h3>
        </div>
        <div className="tibbna-card-content">
          <div className="space-y-4">
            {/* Flow 1 */}
            <div className="flex items-start gap-4 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <CheckCircle size={24} style={{ color: '#059669' }} className="mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium mb-1" style={{ color: '#111827' }}>
                  Flow 1: New Employee → Auto-Setup
                </h4>
                <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                  When an employee is created, automatically generate leave balances and attendance records
                </p>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                  ✓ Active
                </span>
              </div>
            </div>

            {/* Flow 2 */}
            <div className="flex items-start gap-4 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <CheckCircle size={24} style={{ color: '#059669' }} className="mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium mb-1" style={{ color: '#111827' }}>
                  Flow 2: Attendance Processing → Payroll Updates
                </h4>
                <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                  Processed attendance automatically feeds into payroll calculations for the next pay period
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                    ✓ Active
                  </span>
                  {pending?.pendingPayrollUpdates?.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                      {pending.pendingPayrollUpdates.length} pending
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Flow 3 */}
            <div className="flex items-start gap-4 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <CheckCircle size={24} style={{ color: '#059669' }} className="mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium mb-1" style={{ color: '#111827' }}>
                  Flow 3: Leave Approval → Attendance Records
                </h4>
                <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                  Approved leave requests automatically create attendance entries marked as &quot;On Leave&quot; for the entire period
                </p>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                  ✓ Active
                </span>
              </div>
            </div>

            {/* Flow 4 */}
            <div className="flex items-start gap-4 p-4 rounded-lg" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <CheckCircle size={24} style={{ color: '#059669' }} className="mt-1 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium mb-1" style={{ color: '#111827' }}>
                  Flow 4: Payroll Processing → Finance Expenses
                </h4>
                <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                  Payroll processing creates accounting journal entries and updates cash flow in the finance module
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}>
                    ✓ Active
                  </span>
                  {pending?.payrollToFinance?.length > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                      {pending.payrollToFinance.length} pending
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Actions Detail */}
      {totalPending > 0 && (
        <div className="tibbna-card mb-6">
          <div className="tibbna-card-header">
            <h3 className="tibbna-card-title">Pending Integration Actions</h3>
          </div>
          <div className="tibbna-card-content">
            <div className="space-y-3">
              {pending?.pendingPayrollUpdates?.map((item: any, idx: number) => (
                <div key={`payroll-${idx}`} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#92400E' }}>
                      Attendance → Payroll Update
                    </p>
                    <p className="text-xs" style={{ color: '#78350F' }}>
                      Date: {item.date} &middot; {item.employeeIds.length} employees
                    </p>
                  </div>
                  <Clock size={20} style={{ color: '#F59E0B' }} />
                </div>
              ))}

              {pending?.payrollToFinance?.map((item: any, idx: number) => (
                <div key={`finance-${idx}`} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#92400E' }}>
                      Payroll → Finance Journal Entry
                    </p>
                    <p className="text-xs" style={{ color: '#78350F' }}>
                      Period: {item.period.month}/{item.period.year} &middot; IQD {item.totalAmount.toLocaleString()}
                    </p>
                  </div>
                  <Clock size={20} style={{ color: '#F59E0B' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Demo Notice */}
      <div className="p-4 rounded-lg" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <div className="flex items-start gap-3">
          <AlertCircle size={20} style={{ color: '#2563EB' }} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#1E40AF' }}>
              Demo Mode Active
            </p>
            <p className="text-sm" style={{ color: '#1E3A8A' }}>
              All integrations work in demo mode with localStorage. In production, these would connect to your backend API and database.
              <br />
              <strong>Try it:</strong> Create a new employee and watch the system automatically set up their leave balances and attendance records!
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
