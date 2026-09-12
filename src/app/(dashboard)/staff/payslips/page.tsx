'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { FileText, Download, Eye, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface Payslip {
  id: string;
  employee_name: string;
  employee_number: string;
  payslip_number: string;
  period_name: string;
  period_start: string;
  period_end: string;
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  overtime_pay: number;
  night_shift_pay: number;
  gross_salary: number;
  social_security: number;
  health_insurance: number;
  loan_deduction: number;
  advance_deduction: number;
  absence_deduction: number;
  unpaid_leave_deduction: number;
  unpaid_leave_days: number;
  total_deductions: number;
  net_salary: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Month/period selector
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');

  // 1. Load the list of payroll periods once (for the month dropdown)
  useEffect(() => {
    (async () => {
      try {
        const periodsRes = await fetch('/api/hr/payroll/periods').then(r => r.json());
        const list = periodsRes.data ?? periodsRes ?? [];
        const sorted = Array.isArray(list)
          ? [...list].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
          : [];
        setPeriods(sorted);
        if (sorted.length > 0) setSelectedPeriodId(sorted[0].id);
        else setLoading(false);
      } catch {
        setLoading(false);
      }
    })();
  }, []);

  // 2. Whenever the selected month changes, load that period's payslips
  useEffect(() => {
    if (selectedPeriodId) loadPayslips(selectedPeriodId);
  }, [selectedPeriodId]);

  const loadPayslips = async (periodId: string) => {
    try {
      setLoading(true);
      setSelectedPayslip(null);
      const response = await fetch(`/api/hr/payroll/transactions?period_id=${periodId}`);
      const result = await response.json();

      if (result.success) {
        // Postgres NUMERIC columns arrive as strings — coerce to numbers so
        // .toFixed() and arithmetic work on the payslip view.
        const num = (v: any) => (typeof v === 'number' ? v : parseFloat(v) || 0);
        const normalized = (result.data as any[]).map(p => ({
          ...p,
          basic_salary: num(p.basic_salary),
          housing_allowance: num(p.housing_allowance),
          transport_allowance: num(p.transport_allowance),
          meal_allowance: num(p.meal_allowance),
          overtime_pay: num(p.overtime_pay),
          night_shift_pay: num(p.night_shift_pay),
          gross_salary: num(p.gross_salary),
          social_security: num(p.social_security),
          health_insurance: num(p.health_insurance),
          loan_deduction: num(p.loan_deduction),
          advance_deduction: num(p.advance_deduction),
          absence_deduction: num(p.absence_deduction),
          unpaid_leave_deduction: num(p.unpaid_leave_deduction),
          unpaid_leave_days: num(p.unpaid_leave_days),
          total_deductions: num(p.total_deductions),
          net_salary: num(p.net_salary),
        }));
        setPayslips(normalized);
        if (normalized.length > 0) {
          setSelectedPayslip(normalized[0]);
        }
      } else {
        // Logged but never shown: the person at the screen saw nothing.
        toast.error(result?.error || 'Could not load payslips');
        setPayslips([]);
      }
    } catch (error) {
      console.error('Error loading payslips:', error);
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

  const downloadPayslip = () => {
    if (!selectedPayslip) return;
    const p = selectedPayslip;
    const row = (label: string, val: number, color = '#111') =>
      Number(val) > 0
        ? `<tr><td style="padding:6px 0;color:#555">${label}</td><td style="padding:6px 0;text-align:right;color:${color};font-weight:600">${money(val)}</td></tr>`
        : '';

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payslip - ${p.employee_name || ''}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:32px;max-width:720px;margin:auto}
        h1{font-size:22px;margin:0}
        .sub{color:#777;font-size:13px;margin-top:4px}
        .grid{display:flex;gap:24px;margin:20px 0;font-size:13px;flex-wrap:wrap}
        .grid div span{color:#999;display:block}
        table{width:100%;border-collapse:collapse;font-size:14px}
        .section{margin-top:24px}
        .section h3{font-size:14px;margin:0 0 8px;border-bottom:2px solid #eee;padding-bottom:6px}
        .total{display:flex;justify-content:space-between;padding:10px 0;font-weight:700;border-top:2px solid #eee;margin-top:8px}
        .net{display:flex;justify-content:space-between;padding:14px;background:#EFF6FF;border-radius:8px;margin-top:20px;font-size:18px;font-weight:700;color:#1D4ED8}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:16px">
        <div><h1>${p.employee_name || 'Payslip'}</h1><div class="sub">Payslip · ${p.period_name || ''}</div></div>
        <div style="text-align:right;font-size:12px;color:#777">
          <div>Payslip #: ${p.payslip_number || 'N/A'}</div>
          <div>Employee #: ${p.employee_number || 'N/A'}</div>
          <div>Status: ${p.status || ''}</div>
        </div>
      </div>

      <div class="section"><h3 style="color:#10B981">Earnings</h3><table>
        ${row('Basic Salary', p.basic_salary)}
        ${row('Housing Allowance', p.housing_allowance)}
        ${row('Transport Allowance', p.transport_allowance)}
        ${row('Meal Allowance', p.meal_allowance)}
        ${row('Overtime Pay', p.overtime_pay)}
        ${row('Night Shift Pay', p.night_shift_pay)}
      </table><div class="total"><span>Total Gross</span><span style="color:#10B981">${money(p.gross_salary)}</span></div></div>

      <div class="section"><h3 style="color:#EF4444">Deductions</h3><table>
        ${row('Social Security', p.social_security)}
        ${row('Health Insurance', p.health_insurance)}
        ${row('Loan Deduction', p.loan_deduction)}
        ${row('Advance Deduction', p.advance_deduction)}
        ${row('Absence Deduction', p.absence_deduction)}
        ${row(`Unpaid Leave${p.unpaid_leave_days > 0 ? ` (${p.unpaid_leave_days}d)` : ''}`, p.unpaid_leave_deduction, '#92400E')}
      </table><div class="total"><span>Total Deductions</span><span style="color:#EF4444">${money(p.total_deductions)}</span></div></div>

      <div class="net"><span>Net Salary</span><span>${money(p.net_salary)}</span></div>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`;

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) {
      alert('Please allow pop-ups to download the payslip PDF');
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const filteredPayslips = search.trim()
    ? payslips.filter(p =>
        (p.employee_name || '').toLowerCase().includes(search.trim().toLowerCase()) ||
        (p.employee_number || '').toLowerCase().includes(search.trim().toLowerCase())
      )
    : payslips;

  const calculateYTD = () => {
    const currentYear = new Date().getFullYear();
    const ytdPayslips = payslips.filter(p =>
      new Date(p.period_start).getFullYear() === currentYear
    );
    
    return {
      gross: ytdPayslips.reduce((sum, p) => sum + p.gross_salary, 0),
      deductions: ytdPayslips.reduce((sum, p) => sum + p.total_deductions, 0),
      net: ytdPayslips.reduce((sum, p) => sum + p.net_salary, 0)
    };
  };

  const ytd = calculateYTD();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header-section">
        <div>
          <h2 className="page-title">Employee Payslips</h2>
          <p className="page-description">View and download salary statements by month</p>
        </div>
        <div className="flex gap-2 items-center">
          <label style={{ fontSize: '13px', color: '#737373' }}>Month:</label>
          <select
            value={selectedPeriodId}
            onChange={e => setSelectedPeriodId(e.target.value)}
            className="tibbna-input"
            style={{ width: 'auto' }}
          >
            {periods.length === 0 && <option value="">No periods</option>}
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {p.period_name || p.name || `${p.start_date?.slice(0, 7)}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Year-to-Date Summary */}
      <div className="tibbna-grid-3">
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="tibbna-card-title">YTD Gross</p>
                <p className="tibbna-card-value">${(ytd.gross / 1000).toFixed(1)}K</p>
                <p className="tibbna-card-subtitle">{new Date().getFullYear()}</p>
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
                <p className="tibbna-card-title">YTD Deductions</p>
                <p className="tibbna-card-value" style={{ color: '#EF4444' }}>
                  ${(ytd.deductions / 1000).toFixed(1)}K
                </p>
                <p className="tibbna-card-subtitle">{new Date().getFullYear()}</p>
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
                <p className="tibbna-card-title">YTD Net</p>
                <p className="tibbna-card-value" style={{ color: '#10B981' }}>
                  ${(ytd.net / 1000).toFixed(1)}K
                </p>
                <p className="tibbna-card-subtitle">{new Date().getFullYear()}</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
                <TrendingUp size={20} style={{ color: '#10B981' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payslip Details */}
      {selectedPayslip && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="tibbna-section-title" style={{ margin: 0 }}>
                  {selectedPayslip.employee_name || 'Payslip'}
                </h3>
                <p style={{ fontSize: '12px', color: '#a3a3a3', marginTop: 2 }}>
                  Payslip Details · {selectedPayslip.period_name}
                </p>
              </div>
              <button onClick={downloadPayslip} className="btn-secondary flex items-center gap-2">
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
          <div className="tibbna-card-content">
            {/* Period Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6" style={{ fontSize: '13px' }}>
              <div>
                <span style={{ color: '#a3a3a3' }}>Payslip Number</span>
                <p style={{ fontWeight: 500 }}>{selectedPayslip.payslip_number || 'N/A'}</p>
              </div>
              <div>
                <span style={{ color: '#a3a3a3' }}>Period</span>
                <p style={{ fontWeight: 500 }}>
                  {new Date(selectedPayslip.period_start).toLocaleDateString()} - {new Date(selectedPayslip.period_end).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span style={{ color: '#a3a3a3' }}>Currency</span>
                <p style={{ fontWeight: 500 }}>{selectedPayslip.currency}</p>
              </div>
              <div>
                <span style={{ color: '#a3a3a3' }}>Status</span>
                <p style={{ fontWeight: 500 }}>
                  <span className="tibbna-badge" style={{
                    backgroundColor: selectedPayslip.status === 'PAID' ? '#D1FAE5' : '#FEF3C7',
                    color: selectedPayslip.status === 'PAID' ? '#065F46' : '#92400E'
                  }}>
                    {selectedPayslip.status}
                  </span>
                </p>
              </div>
            </div>

            {/* Earnings */}
            <div className="mb-6">
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#10B981' }}>
                Earnings
              </h4>
              <div className="grid grid-cols-2 gap-3" style={{ fontSize: '13px' }}>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Basic Salary</span>
                  <strong>${selectedPayslip.basic_salary.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Housing Allowance</span>
                  <strong>${selectedPayslip.housing_allowance.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Transport Allowance</span>
                  <strong>${selectedPayslip.transport_allowance.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Meal Allowance</span>
                  <strong>${selectedPayslip.meal_allowance.toFixed(2)}</strong>
                </div>
                {selectedPayslip.overtime_pay > 0 && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Overtime Pay</span>
                    <strong>${selectedPayslip.overtime_pay.toFixed(2)}</strong>
                  </div>
                )}
                {selectedPayslip.night_shift_pay > 0 && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Night Shift Pay</span>
                    <strong>${selectedPayslip.night_shift_pay.toFixed(2)}</strong>
                  </div>
                )}
              </div>
              <div className="flex justify-between p-3 bg-green-50 rounded mt-3" style={{ fontSize: '14px' }}>
                <strong>Total Gross</strong>
                <strong style={{ color: '#10B981' }}>${selectedPayslip.gross_salary.toFixed(2)}</strong>
              </div>
            </div>

            {/* Deductions */}
            <div className="mb-6">
              <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#EF4444' }}>
                Deductions
              </h4>
              <div className="grid grid-cols-2 gap-3" style={{ fontSize: '13px' }}>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Social Security</span>
                  <strong>${selectedPayslip.social_security.toFixed(2)}</strong>
                </div>
                {selectedPayslip.health_insurance > 0 && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Health Insurance</span>
                    <strong>${selectedPayslip.health_insurance.toFixed(2)}</strong>
                  </div>
                )}
                {selectedPayslip.loan_deduction > 0 && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Loan Deduction</span>
                    <strong>${selectedPayslip.loan_deduction.toFixed(2)}</strong>
                  </div>
                )}
                {selectedPayslip.advance_deduction > 0 && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Advance Deduction</span>
                    <strong>${selectedPayslip.advance_deduction.toFixed(2)}</strong>
                  </div>
                )}
                {selectedPayslip.absence_deduction > 0 && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Absence Deduction</span>
                    <strong>${selectedPayslip.absence_deduction.toFixed(2)}</strong>
                  </div>
                )}
                {selectedPayslip.unpaid_leave_deduction > 0 && (
                  <div className="flex justify-between p-2 bg-amber-50 rounded">
                    <span>Unpaid Leave{selectedPayslip.unpaid_leave_days > 0 ? ` (${selectedPayslip.unpaid_leave_days}d)` : ''}</span>
                    <strong>${selectedPayslip.unpaid_leave_deduction.toFixed(2)}</strong>
                  </div>
                )}
              </div>
              <div className="flex justify-between p-3 bg-red-50 rounded mt-3" style={{ fontSize: '14px' }}>
                <strong>Total Deductions</strong>
                <strong style={{ color: '#EF4444' }}>${selectedPayslip.total_deductions.toFixed(2)}</strong>
              </div>
            </div>

            {/* Net Salary */}
            <div className="flex justify-between p-4 bg-blue-50 rounded" style={{ fontSize: '16px' }}>
              <strong>Net Salary</strong>
              <strong style={{ color: '#3B82F6', fontSize: '18px' }}>
                ${selectedPayslip.net_salary.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Payslip History */}
      <div className="tibbna-card">
        <div className="tibbna-card-header">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>
              Employee Payslips ({filteredPayslips.length})
            </h3>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee name…"
              className="tibbna-input"
              style={{ width: '220px' }}
            />
          </div>
        </div>
        <div className="tibbna-card-content">
          {filteredPayslips.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">
                {payslips.length === 0 ? 'No payslips available yet' : 'No employee matches your search'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPayslips.map(payslip => (
                <div
                  key={payslip.id}
                  onClick={() => setSelectedPayslip(payslip)}
                  className={`p-4 border rounded cursor-pointer transition-all ${
                    selectedPayslip?.id === payslip.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DBEAFE' }}>
                        <FileText size={20} style={{ color: '#3B82F6' }} />
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>
                          {payslip.employee_name || 'Unknown Employee'}
                          {payslip.unpaid_leave_deduction > 0 && (
                            <span style={{ marginLeft: 8, fontSize: '11px', color: '#92400E', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: 4 }}>
                              Unpaid Leave
                            </span>
                          )}
                        </p>
                        <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                          {payslip.period_name} · {payslip.employee_number || ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>
                        ${payslip.net_salary.toFixed(2)}
                      </p>
                      <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                        Gross: ${payslip.gross_salary.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
