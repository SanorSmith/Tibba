'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, FileText, Download, Plus, Calculator, CheckCircle, AlertCircle, Clock, Calendar } from 'lucide-react';
// Using simple alerts for notifications

interface PayrollPeriod {
  id: string;
  period_name: string;
  period_code: string;
  start_date: string;
  end_date: string;
  payment_date: string;
  status: string;
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
}

interface PayrollTransaction {
  id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  basic_salary: number | string;
  housing_allowance: number | string;
  transport_allowance: number | string;
  meal_allowance: number | string;
  overtime_pay: number | string;
  gross_salary: number | string;
  total_deductions: number | string;
  net_salary: number | string;
  status: string;
  warnings: string[];
}

export default function PayrollDashboard() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [transactions, setTransactions] = useState<PayrollTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadTransactions(selectedPeriod);
    }
  }, [selectedPeriod]);

  const loadPeriods = async () => {
    try {
      const response = await fetch('/api/hr/payroll/periods');
      const result = await response.json();
      
      if (result.success) {
        setPeriods(result.data);
        if (result.data.length > 0) {
          setSelectedPeriod(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading periods:', error);
      alert('Failed to load payroll periods');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (periodId: string) => {
    try {
      const response = await fetch(`/api/hr/payroll/transactions?period_id=${periodId}`);
      const result = await response.json();
      
      if (result.success) {
        setTransactions(result.data);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };

  const calculatePayroll = async () => {
    if (!selectedPeriod) return;
    
    setCalculating(true);
    try {
      const response = await fetch('/api/hr/payroll/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period_id: selectedPeriod })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`Payroll calculated for ${result.data.successful} employees`);
        if (result.data.errors.length > 0) {
          alert(`Warning: ${result.data.errors.length} employees had errors`);
        }
        loadPeriods();
        loadTransactions(selectedPeriod);
      } else {
        alert(result.error || 'Failed to calculate payroll');
      }
    } catch (error) {
      console.error('Error calculating payroll:', error);
      alert('Failed to calculate payroll');
    } finally {
      setCalculating(false);
    }
  };

  const currentPeriod = periods.find(p => p.id === selectedPeriod);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Payroll Management</h2>
          <p className="page-description">Process salaries, manage compensation, and track payments</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedPeriod} 
            onChange={e => setSelectedPeriod(e.target.value)} 
            className="tibbna-input" 
            style={{ width: 'auto' }}
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.period_name}</option>
            ))}
          </select>
          <button 
            onClick={calculatePayroll}
            disabled={calculating || !currentPeriod || currentPeriod.status === 'PAID'}
            className="btn-primary flex items-center gap-2"
          >
            {calculating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Calculating...</span>
              </>
            ) : (
              <>
                <Calculator size={14} />
                <span>Calculate Payroll</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPIs */}
      {currentPeriod && (
        <div className="tibbna-grid-4 tibbna-section">
          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="tibbna-card-title">Total Gross</p>
                  <p className="tibbna-card-value">{((currentPeriod.total_gross * 1450) / 1000000).toFixed(1)}M</p>
                  <p className="tibbna-card-subtitle">IQD</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                  <DollarSign size={20} style={{ color: '#3B82F6' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="tibbna-card-title">Total Net</p>
                  <p className="tibbna-card-value" style={{ color: '#10B981' }}>
                    {((currentPeriod.total_net * 1450) / 1000000).toFixed(1)}M
                  </p>
                  <p className="tibbna-card-subtitle">IQD</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                  <TrendingUp size={20} style={{ color: '#10B981' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="tibbna-card-title">Deductions</p>
                  <p className="tibbna-card-value" style={{ color: '#EF4444' }}>
                    {((currentPeriod.total_deductions * 1450) / 1000000).toFixed(1)}M
                  </p>
                  <p className="tibbna-card-subtitle">IQD</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                  <TrendingDown size={20} style={{ color: '#EF4444' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="tibbna-card">
            <div className="tibbna-card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="tibbna-card-title">Employees</p>
                  <p className="tibbna-card-value">{currentPeriod.total_employees}</p>
                  <p className="tibbna-card-subtitle">{currentPeriod.status}</p>
                </div>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                  <CreditCard size={20} style={{ color: '#6366F1' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Status */}
      {currentPeriod && (
        <div className="tibbna-card tibbna-section">
          <div className="tibbna-card-header">
            <div className="flex items-center justify-between">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>
                {currentPeriod.period_name} - Status
              </h3>
              <span className="tibbna-badge" style={{
                backgroundColor: 
                  currentPeriod.status === 'PAID' ? '#D1FAE5' : 
                  currentPeriod.status === 'APPROVED' ? '#DBEAFE' :
                  currentPeriod.status === 'CALCULATED' ? '#FEF3C7' : '#F3F4F6',
                color: 
                  currentPeriod.status === 'PAID' ? '#065F46' : 
                  currentPeriod.status === 'APPROVED' ? '#1D4ED8' :
                  currentPeriod.status === 'CALCULATED' ? '#92400E' : '#374151'
              }}>
                {currentPeriod.status === 'PAID' && <CheckCircle size={14} className="inline mr-1" />}
                {currentPeriod.status === 'CALCULATED' && <Clock size={14} className="inline mr-1" />}
                {currentPeriod.status}
              </span>
            </div>
          </div>
          <div className="tibbna-card-content">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" style={{ fontSize: '13px' }}>
              <div>
                <span style={{ color: '#a3a3a3' }}>Period Start</span>
                <p style={{ fontWeight: 500 }}>{new Date(currentPeriod.start_date).toLocaleDateString()}</p>
              </div>
              <div>
                <span style={{ color: '#a3a3a3' }}>Period End</span>
                <p style={{ fontWeight: 500 }}>{new Date(currentPeriod.end_date).toLocaleDateString()}</p>
              </div>
              <div>
                <span style={{ color: '#a3a3a3' }}>Payment Date</span>
                <p style={{ fontWeight: 500 }}>
                  {currentPeriod.payment_date ? new Date(currentPeriod.payment_date).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div>
                <span style={{ color: '#a3a3a3' }}>Employees</span>
                <p style={{ fontWeight: 500 }}>{currentPeriod.total_employees}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Link href={`/hr/payroll/process?period=${selectedPeriod}`}>
                <button className="btn-primary flex items-center justify-center gap-2">
                  <FileText size={14} /> Generate Payslips
                </button>
              </Link>
              <Link href={`/hr/payroll/bank-transfer?period=${selectedPeriod}`}>
                <button className="btn-secondary flex items-center justify-center gap-2">
                  <Download size={14} /> Export Bank File
                </button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Transactions Table */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>
            Employee Payroll Details ({transactions.length})
          </h3>
        </div>
        <div className="tibbna-card-content">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No payroll data calculated yet</p>
              <button 
                onClick={calculatePayroll}
                disabled={calculating}
                className="btn-primary mt-4"
              >
                Calculate Payroll
              </button>
            </div>
          ) : (
            <>
              <div className="hidden md:block tibbna-table-container">
                <table className="tibbna-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Basic</th>
                      <th>Allowances</th>
                      <th>Overtime</th>
                      <th>Gross</th>
                      <th>Deductions</th>
                      <th>Net</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontSize: '13px', fontWeight: 500 }}>
                          {t.employee_name}
                          {t.warnings && t.warnings.length > 0 && (
                            <AlertCircle size={14} className="inline ml-1 text-yellow-500" />
                          )}
                        </td>
                        <td style={{ fontSize: '12px', color: '#525252' }}>{t.department}</td>
                        <td style={{ fontSize: '13px' }}>{(parseFloat(String(t.basic_salary || 0)) * 1450).toLocaleString()} IQD</td>
                        <td style={{ fontSize: '13px' }}>
                          {((parseFloat(String(t.housing_allowance || 0)) + parseFloat(String(t.transport_allowance || 0)) + parseFloat(String(t.meal_allowance || 0))) * 1450).toLocaleString()} IQD
                        </td>
                        <td style={{ fontSize: '13px' }}>{(parseFloat(String(t.overtime_pay || 0)) * 1450).toLocaleString()} IQD</td>
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>{(parseFloat(String(t.gross_salary || 0)) * 1450).toLocaleString()} IQD</td>
                        <td style={{ fontSize: '13px', color: '#EF4444' }}>{(parseFloat(String(t.total_deductions || 0)) * 1450).toLocaleString()} IQD</td>
                        <td style={{ fontSize: '13px', fontWeight: 700, color: '#10B981' }}>
                          {(parseFloat(String(t.net_salary || 0)) * 1450).toLocaleString()} IQD
                        </td>
                        <td>
                          <span className="tibbna-badge" style={{
                            backgroundColor: t.status === 'APPROVED' ? '#D1FAE5' : '#FEF3C7',
                            color: t.status === 'APPROVED' ? '#065F46' : '#92400E',
                            fontSize: '11px'
                          }}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View */}
              <div className="md:hidden space-y-2">
                {transactions.map(t => (
                  <div key={t.id} style={{ padding: '10px', border: '1px solid #e4e4e4', borderRadius: '4px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{t.employee_name}</p>
                    <p style={{ fontSize: '11px', color: '#a3a3a3' }}>{t.department}</p>
                    <div className="grid grid-cols-3 gap-2 mt-2" style={{ fontSize: '12px' }}>
                      <div><span style={{ color: '#a3a3a3' }}>Gross:</span> <strong>{(parseFloat(String(t.gross_salary || 0)) * 1450).toLocaleString()} IQD</strong></div>
                      <div><span style={{ color: '#a3a3a3' }}>Deductions:</span> <strong style={{ color: '#EF4444' }}>{(parseFloat(String(t.total_deductions || 0)) * 1450).toLocaleString()} IQD</strong></div>
                      <div><span style={{ color: '#a3a3a3' }}>Net:</span> <strong style={{ color: '#10B981' }}>{(parseFloat(String(t.net_salary || 0)) * 1450).toLocaleString()} IQD</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="tibbna-grid-3 tibbna-section">
        <Link href="/hr/payroll/attendance-review">
          <div className="tibbna-card hover:shadow-md transition-shadow cursor-pointer">
            <div className="tibbna-card-content">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#ECFDF5' }}>
                  <Calendar size={20} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Attendance Review</p>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Review before calculation</p>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/hr/payroll/approvals">
          <div className="tibbna-card hover:shadow-md transition-shadow cursor-pointer">
            <div className="tibbna-card-content">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EFF6FF' }}>
                  <CheckCircle size={20} style={{ color: '#2563EB' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Approvals</p>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Submit & approve payroll</p>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/hr/payroll/tax-calculator">
          <div className="tibbna-card hover:shadow-md transition-shadow cursor-pointer">
            <div className="tibbna-card-content">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF2F2' }}>
                  <Calculator size={20} style={{ color: '#EF4444' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Iraqi Tax Calculator</p>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Calculate income tax</p>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/hr/payroll/bank-transfer">
          <div className="tibbna-card hover:shadow-md transition-shadow cursor-pointer">
            <div className="tibbna-card-content">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                  <DollarSign size={20} style={{ color: '#16A34A' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Bank Transfer</p>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Generate payment files</p>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/hr/payroll/loans">
          <div className="tibbna-card hover:shadow-md transition-shadow cursor-pointer">
            <div className="tibbna-card-content">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                  <CreditCard size={20} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Manage Loans</p>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>Employee loan requests</p>
                </div>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/hr/reports/payroll">
          <div className="tibbna-card hover:shadow-md transition-shadow cursor-pointer">
            <div className="tibbna-card-content">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                  <FileText size={20} style={{ color: '#3B82F6' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Payroll Reports</p>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>View detailed reports</p>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}
