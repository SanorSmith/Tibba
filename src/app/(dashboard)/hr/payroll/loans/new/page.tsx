'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, DollarSign, Calculator } from 'lucide-react';
import type { LoanFormData } from '@/types/hr';
import { FormGroup, FormRow, FormActions, FormSection } from '@/components/modules/hr/shared/form-components';
import { ApprovalWorkflow } from '@/components/modules/hr/shared/approval-workflow';
import employeesData from '@/data/hr/employees.json';

export default function NewLoanPage() {
  const [form, setForm] = useState<LoanFormData>({
    employee_id: '',
    loan_type: 'PERSONAL',
    amount: 0,
    number_of_installments: 12,
    reason: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loanNumber, setLoanNumber] = useState('');

  const activeEmployees = employeesData.employees.filter(e => e.employment_status === 'ACTIVE');
  const selectedEmployee = activeEmployees.find(e => e.id === form.employee_id);

  const installmentAmount = useMemo(() => {
    if (!form.amount || !form.number_of_installments) return 0;
    return Math.round(form.amount / form.number_of_installments);
  }, [form.amount, form.number_of_installments]);

  const maxLoanByType: Record<string, number> = {
    PERSONAL: 10000000,
    SALARY_ADVANCE: selectedEmployee?.basic_salary || 3000000,
    EMERGENCY: 5000000,
  };

  const update = (field: keyof LoanFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.employee_id) e.employee_id = 'Select an employee';
    if (!form.amount || form.amount <= 0) e.amount = 'Enter a valid amount';
    if (form.amount > maxLoanByType[form.loan_type]) e.amount = `Maximum for ${form.loan_type.replace(/_/g, ' ')} is ${(maxLoanByType[form.loan_type] / 1000000).toFixed(1)}M IQD`;
    if (!form.number_of_installments || form.number_of_installments < 1) e.number_of_installments = 'At least 1 installment';
    if (!form.reason.trim()) e.reason = 'Reason is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const num = `LN-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setLoanNumber(num);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D1FAE5' }}>
          <DollarSign size={32} style={{ color: '#065F46' }} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Loan Request Submitted</h2>
        <p style={{ fontSize: '14px', color: '#525252' }}>Loan Number: <strong>{loanNumber}</strong></p>
        <p style={{ fontSize: '14px', color: '#525252' }}>
          {selectedEmployee?.first_name} {selectedEmployee?.last_name} — {(form.amount / 1000000).toFixed(2)}M IQD — {form.number_of_installments} installments
        </p>
        <p style={{ fontSize: '13px', color: '#a3a3a3' }}>The loan has been sent for approval.</p>
        <div className="flex gap-3 mt-4">
          <Link href="/hr/payroll"><button className="btn-secondary">Back to Payroll</button></Link>
          <button className="btn-primary" onClick={() => { setSubmitted(false); setForm({ employee_id: '', loan_type: 'PERSONAL', amount: 0, number_of_installments: 12, reason: '' }); }}>
            New Loan
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Create New Loan</h2>
            <p className="page-description">Employee loan or salary advance request</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="tibbna-card">
            <div className="tibbna-card-content space-y-5">
              <FormSection title="Employee & Loan Type">
                <FormRow columns={2}>
                  <FormGroup label="Employee" required error={errors.employee_id}>
                    <select className="tibbna-input" value={form.employee_id} onChange={e => update('employee_id', e.target.value)}>
                      <option value="">Select Employee</option>
                      {activeEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.first_name} {emp.last_name} ({emp.employee_number})</option>
                      ))}
                    </select>
                  </FormGroup>
                  <FormGroup label="Loan Type" required>
                    <select className="tibbna-input" value={form.loan_type} onChange={e => update('loan_type', e.target.value)}>
                      <option value="PERSONAL">Personal Loan</option>
                      <option value="SALARY_ADVANCE">Salary Advance</option>
                      <option value="EMERGENCY">Emergency Loan</option>
                    </select>
                  </FormGroup>
                </FormRow>
              </FormSection>

              <FormSection title="Loan Details">
                <FormRow columns={2}>
                  <FormGroup label="Loan Amount (IQD)" required error={errors.amount} helper={`Max: ${(maxLoanByType[form.loan_type] / 1000000).toFixed(1)}M IQD`}>
                    <input className="tibbna-input" type="number" value={form.amount || ''} onChange={e => update('amount', Number(e.target.value))} placeholder="e.g. 5000000" />
                  </FormGroup>
                  <FormGroup label="Number of Installments" required error={errors.number_of_installments} helper="1-36 months">
                    <input className="tibbna-input" type="range" min={1} max={36} value={form.number_of_installments} onChange={e => update('number_of_installments', Number(e.target.value))} />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{form.number_of_installments} months</span>
                  </FormGroup>
                </FormRow>
                <FormGroup label="Reason" required error={errors.reason}>
                  <textarea className="tibbna-input" style={{ width: '100%', minHeight: '80px', resize: 'vertical' }} value={form.reason} onChange={e => update('reason', e.target.value)} placeholder="Reason for loan request..." />
                </FormGroup>
              </FormSection>

              <FormSection title="Approval Workflow">
                <ApprovalWorkflow steps={[
                  { label: 'Submit', status: 'APPROVED', approver: 'Employee' },
                  { label: 'Manager', status: 'NOT_STARTED', approver: 'Department Head' },
                  { label: 'Finance', status: 'NOT_STARTED', approver: 'Finance Dept' },
                  { label: 'HR', status: 'NOT_STARTED', approver: 'HR Director' },
                ]} />
              </FormSection>

              <FormActions>
                <Link href="/hr/payroll"><button className="btn-secondary">Cancel</button></Link>
                <button className="btn-primary flex items-center gap-2" onClick={handleSubmit}>
                  <Save size={16} /> Submit Loan Request
                </button>
              </FormActions>
            </div>
          </div>
        </div>

        {/* Loan Calculator Sidebar */}
        <div>
          <div className="tibbna-card">
            <div className="tibbna-card-header">
              <h3 className="tibbna-section-title flex items-center gap-2" style={{ margin: 0 }}>
                <Calculator size={16} /> Loan Calculator
              </h3>
            </div>
            <div className="tibbna-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Loan Amount</span>
                <span style={{ fontWeight: 600 }}>{form.amount ? `${(form.amount / 1000000).toFixed(2)}M IQD` : '-'}</span>
              </div>
              <div className="flex justify-between" style={{ fontSize: '13px' }}>
                <span style={{ color: '#525252' }}>Installments</span>
                <span style={{ fontWeight: 600 }}>{form.number_of_installments} months</span>
              </div>
              <div style={{ borderTop: '1px solid #e4e4e4', paddingTop: '12px' }}>
                <div className="flex justify-between" style={{ fontSize: '14px' }}>
                  <span style={{ fontWeight: 600 }}>Monthly Installment</span>
                  <span style={{ fontWeight: 700, color: '#1D4ED8', fontSize: '16px' }}>
                    {installmentAmount ? `${(installmentAmount / 1000).toFixed(0)}K IQD` : '-'}
                  </span>
                </div>
              </div>
              {selectedEmployee && (
                <>
                  <div style={{ borderTop: '1px solid #e4e4e4', paddingTop: '12px' }}>
                    <p style={{ fontSize: '12px', color: '#a3a3a3', marginBottom: '4px' }}>Employee Info</p>
                    <p style={{ fontSize: '13px', fontWeight: 500 }}>{selectedEmployee.first_name} {selectedEmployee.last_name}</p>
                    <p style={{ fontSize: '12px', color: '#525252' }}>{selectedEmployee.department_name}</p>
                    <p style={{ fontSize: '12px', color: '#525252' }}>Basic Salary: {((selectedEmployee.basic_salary || 0) / 1000).toFixed(0)}K IQD</p>
                  </div>
                  {installmentAmount > 0 && selectedEmployee.basic_salary && (
                    <div style={{ padding: '8px', backgroundColor: installmentAmount > selectedEmployee.basic_salary * 0.3 ? '#FEE2E2' : '#D1FAE5', fontSize: '12px' }}>
                      <p style={{ fontWeight: 500, color: installmentAmount > selectedEmployee.basic_salary * 0.3 ? '#991B1B' : '#065F46' }}>
                        Installment is {((installmentAmount / selectedEmployee.basic_salary) * 100).toFixed(1)}% of basic salary
                        {installmentAmount > selectedEmployee.basic_salary * 0.3 ? ' (exceeds 30% limit)' : ' (within limit)'}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
