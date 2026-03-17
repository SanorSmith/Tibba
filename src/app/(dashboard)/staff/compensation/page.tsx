'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Award, Calendar, CreditCard, AlertCircle } from 'lucide-react';

interface Compensation {
  basic_salary: number;
  housing_allowance: number;
  transport_allowance: number;
  meal_allowance: number;
  payment_frequency: string;
  total_package: number;
  salary_grade: string;
  currency: string;
  effective_from: string;
}

interface Loan {
  id: string;
  loan_number: string;
  loan_type: string;
  loan_amount: number;
  monthly_installment: number;
  paid_installments: number;
  total_installments: number;
  remaining_balance: number;
  status: string;
}

interface Advance {
  id: string;
  advance_number: string;
  advance_amount: number;
  deduction_amount: number;
  deducted_months: number;
  deduction_months: number;
  remaining_balance: number;
  status: string;
}

function EmployeeCompensationPage() {
  // Use a staff ID with WEEKLY payment frequency for demo
  const testUserId = 'eb892974-5624-42e5-a0de-6a1e80cd182a';
  const [compensation, setCompensation] = useState<Compensation | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompensation();
    loadLoans();
    loadAdvances();
  }, []);

  const loadCompensation = async () => {
    try {
      console.log('Loading compensation for:', testUserId);
      const response = await fetch(`/api/hr/compensation?employee_id=${testUserId}`);
      
      console.log('API Response status:', response.status);
      const result = await response.json();
      
      console.log('Compensation API response:', result);
      console.log('Response success:', result.success);
      console.log('Response data:', result.data);
      
      if (result.success && result.data) {
        console.log('Setting compensation data:', result.data);
        setCompensation(result.data);
      } else {
        console.log('API returned success=false or no data');
        console.log('Success:', result.success);
        console.log('Data:', result.data);
        console.log('Error:', result.error);
      }
    } catch (error) {
      console.error('Error loading compensation:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLoans = async () => {
    try {
      const response = await fetch(`/api/hr/payroll/loans?employee_id=${testUserId}`);
      const result = await response.json();
      
      if (result.success) {
        setLoans(result.data);
      }
    } catch (error) {
      console.error('Error loading loans:', error);
    }
  };

  const loadAdvances = async () => {
    try {
      const response = await fetch(`/api/hr/payroll/advances?employee_id=${testUserId}`);
      const result = await response.json();
      
      if (result.success) {
        setAdvances(result.data);
      }
    } catch (error) {
      console.error('Error loading advances:', error);
    }
  };

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
          <h2 className="page-title">My Compensation</h2>
          <p className="page-description">View your salary details and benefits</p>
        </div>
      </div>

      {/* Debug Info */}
      <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '5px', fontSize: '12px' }}>
        <strong>Debug Info:</strong><br/>
        Loading: {loading.toString()}<br/>
        Compensation: {compensation ? 'Found' : 'Not found'}<br/>
        Test User ID: {testUserId}
      </div>

      {/* Compensation Summary */}
      {compensation ? (
        <>
          <div className="tibbna-grid-4">
            <div className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="tibbna-card-title">Basic Salary</p>
                    <p className="tibbna-card-value">${parseFloat(compensation.basic_salary).toFixed(0)}</p>
                    <p className="tibbna-card-subtitle">{compensation.currency}/month</p>
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
                    <p className="tibbna-card-title">Allowances</p>
                    <p className="tibbna-card-value">
                      ${(parseFloat(compensation.housing_allowance) + parseFloat(compensation.transport_allowance) + parseFloat(compensation.meal_allowance)).toFixed(0)}
                    </p>
                    <p className="tibbna-card-subtitle">{compensation.currency}/month</p>
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
                    <p className="tibbna-card-title">Total Package</p>
                    <p className="tibbna-card-value" style={{ color: '#10B981' }}>
                      ${parseFloat(compensation.total_package).toFixed(0)}
                    </p>
                    <p className="tibbna-card-subtitle">{compensation.currency}/month</p>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                    <Award size={20} style={{ color: '#F59E0B' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="tibbna-card">
              <div className="tibbna-card-content">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="tibbna-card-title">Payment Frequency</p>
                    <p className="tibbna-card-value">
                      {compensation.payment_frequency === 'WEEKLY' ? 'Weekly' :
                       compensation.payment_frequency === 'BI-WEEKLY' ? 'Bi-Weekly' :
                       compensation.payment_frequency === 'QUARTERLY' ? 'Quarterly' : 'Monthly'}
                    </p>
                    <p className="tibbna-card-subtitle">Pay schedule</p>
                  </div>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E0E7FF' }}>
                    <Calendar size={20} style={{ color: '#6366F1' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title" style={{ margin: 0 }}>Compensation Breakdown</h3>
            </div>
            <div className="tibbna-card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Salary */}
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Basic Salary</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#3B82F6' }}>
                      ${parseFloat(compensation.basic_salary).toFixed(2)}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                    Base monthly salary
                  </p>
                </div>

                {/* Housing Allowance */}
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Housing Allowance</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>
                      ${parseFloat(compensation.housing_allowance).toFixed(2)}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                    {((parseFloat(compensation.housing_allowance) / parseFloat(compensation.basic_salary)) * 100).toFixed(0)}% of basic salary
                  </p>
                </div>

                {/* Transport Allowance */}
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Transport Allowance</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>
                      ${parseFloat(compensation.transport_allowance).toFixed(2)}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                    {((parseFloat(compensation.transport_allowance) / parseFloat(compensation.basic_salary)) * 100).toFixed(0)}% of basic salary
                  </p>
                </div>

                {/* Meal Allowance */}
                <div className="p-4 bg-gray-50 rounded">
                  <div className="flex justify-between items-center mb-2">
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>Meal Allowance</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#10B981' }}>
                      ${parseFloat(compensation.meal_allowance).toFixed(2)}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#a3a3a3' }}>
                    {((parseFloat(compensation.meal_allowance) / parseFloat(compensation.basic_salary)) * 100).toFixed(0)}% of basic salary
                  </p>
                </div>
              </div>

              {/* Total */}
              <div className="mt-4 p-4 bg-blue-50 rounded">
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>Total Monthly Package</span>
                  <span style={{ fontSize: '20px', fontWeight: 700, color: '#3B82F6' }}>
                    ${parseFloat(compensation.total_package).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Effective Date */}
              <div className="mt-4 flex items-center gap-2" style={{ fontSize: '13px', color: '#a3a3a3' }}>
                <Calendar size={14} />
                <span>Effective from: {new Date(compensation.effective_from).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="tibbna-card">
          <div className="tibbna-card-content">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <DollarSign size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No Compensation Data</h3>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                No compensation information found for your profile.
              </p>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                Please contact HR to set up your compensation details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Loans */}
      {loans.length > 0 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Active Loans ({loans.length})</h3>
          </div>
          <div className="tibbna-card-content">
            <div className="space-y-3">
              {loans.map(loan => (
                <div key={loan.id} className="p-4 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} style={{ color: '#F59E0B' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{loan.loan_number}</span>
                      <span className="tibbna-badge" style={{
                        backgroundColor: loan.status === 'ACTIVE' ? '#D1FAE5' : '#FEF3C7',
                        color: loan.status === 'ACTIVE' ? '#065F46' : '#92400E',
                        fontSize: '11px'
                      }}>
                        {loan.status}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#a3a3a3' }}>{loan.loan_type}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#a3a3a3' }}>Loan Amount</span>
                      <p style={{ fontWeight: 600 }}>${loan.loan_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span style={{ color: '#a3a3a3' }}>Monthly</span>
                      <p style={{ fontWeight: 600 }}>${loan.monthly_installment.toFixed(2)}</p>
                    </div>
                    <div>
                      <span style={{ color: '#a3a3a3' }}>Progress</span>
                      <p style={{ fontWeight: 600 }}>{loan.paid_installments}/{loan.total_installments}</p>
                    </div>
                    <div>
                      <span style={{ color: '#a3a3a3' }}>Remaining</span>
                      <p style={{ fontWeight: 600, color: '#EF4444' }}>${loan.remaining_balance.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${(loan.paid_installments / loan.total_installments) * 100}%` }}
                      ></div>
                    </div>
                    <p style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '4px' }}>
                      {((loan.paid_installments / loan.total_installments) * 100).toFixed(0)}% paid
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Advances */}
      {advances.length > 0 && (
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Salary Advances ({advances.length})</h3>
          </div>
          <div className="tibbna-card-content">
            <div className="space-y-3">
              {advances.map(advance => (
                <div key={advance.id} className="p-4 border rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign size={18} style={{ color: '#6366F1' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{advance.advance_number}</span>
                      <span className="tibbna-badge" style={{
                        backgroundColor: advance.status === 'DEDUCTING' ? '#FEF3C7' : '#D1FAE5',
                        color: advance.status === 'DEDUCTING' ? '#92400E' : '#065F46',
                        fontSize: '11px'
                      }}>
                        {advance.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3" style={{ fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#a3a3a3' }}>Advance Amount</span>
                      <p style={{ fontWeight: 600 }}>${advance.advance_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span style={{ color: '#a3a3a3' }}>Monthly Deduction</span>
                      <p style={{ fontWeight: 600 }}>${advance.deduction_amount.toFixed(2)}</p>
                    </div>
                    <div>
                      <span style={{ color: '#a3a3a3' }}>Progress</span>
                      <p style={{ fontWeight: 600 }}>{advance.deducted_months}/{advance.deduction_months}</p>
                    </div>
                    <div>
                      <span style={{ color: '#a3a3a3' }}>Remaining</span>
                      <p style={{ fontWeight: 600, color: '#EF4444' }}>${advance.remaining_balance.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(advance.deducted_months / advance.deduction_months) * 100}%` }}
                      ></div>
                    </div>
                    <p style={{ fontSize: '11px', color: '#a3a3a3', marginTop: '4px' }}>
                      {((advance.deducted_months / advance.deduction_months) * 100).toFixed(0)}% deducted
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      </div>
  );
}

export default EmployeeCompensationPage;
