'use client';

import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Payslip {
  id: string;
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
  total_deductions: number;
  net_salary: number;
  currency: string;
  status: string;
  created_at: string;
}

export default function EmployeePayslipsPage() {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (user?.id) {
      loadPayslips();
    }
  }, [user, year]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hr/payroll/transactions?employee_id=${user?.id}`);
      const result = await response.json();
      
      if (result.success) {
        setPayslips(result.data);
        if (result.data.length > 0) {
          setSelectedPayslip(result.data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading payslips:', error);
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="page-title">My Payslips</h2>
          <p className="page-description">View and download your salary statements</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={year} 
            onChange={e => setYear(parseInt(e.target.value))} 
            className="tibbna-input" 
            style={{ width: 'auto' }}
          >
            {[2026, 2025, 2024].map(y => (
              <option key={y} value={y}>{y}</option>
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
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>
                Payslip Details - {selectedPayslip.period_name}
              </h3>
              <button className="btn-secondary flex items-center gap-2">
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
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>
            Payslip History ({payslips.length})
          </h3>
        </div>
        <div className="tibbna-card-content">
          {payslips.length === 0 ? (
            <div className="text-center py-8">
              <FileText size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No payslips available yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payslips.map(payslip => (
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
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{payslip.period_name}</p>
                        <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                          {new Date(payslip.period_start).toLocaleDateString()} - {new Date(payslip.period_end).toLocaleDateString()}
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
