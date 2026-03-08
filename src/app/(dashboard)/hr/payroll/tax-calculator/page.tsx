'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, DollarSign, Users, Percent, Info } from 'lucide-react';

const USD_TO_IQD = 1450;

interface TaxBracketResult {
  min: number;
  max: number;
  rate: number;
  taxableAmount: number;
  taxAmount: number;
}

interface TaxResult {
  grossSalaryUSD: number;
  grossSalaryIQD: number;
  personalExemption: number;
  familyExemption: number;
  totalExemptions: number;
  taxableIncomeIQD: number;
  taxIQD: number;
  taxUSD: number;
  effectiveRate: number;
  netSalaryUSD: number;
  brackets: TaxBracketResult[];
}

function calculateIraqiTax(grossSalaryUSD: number, dependents: number): TaxResult {
  const grossIQD = grossSalaryUSD * USD_TO_IQD;
  const personalExemption = 1000000;
  const familyExemption = Math.min(dependents, 3) * 500000;
  const totalExemptions = personalExemption + familyExemption;
  const taxableIncome = Math.max(0, grossIQD - totalExemptions);

  const brackets = [
    { min: 0, max: 1000000, rate: 0 },
    { min: 1000001, max: 2000000, rate: 0.03 },
    { min: 2000001, max: 3333333, rate: 0.05 },
    { min: 3333334, max: 8333333, rate: 0.10 },
    { min: 8333334, max: 16666666, rate: 0.15 },
    { min: 16666667, max: Infinity, rate: 0.15 },
  ];

  let remainingIncome = taxableIncome;
  let totalTax = 0;
  const bracketDetails: TaxBracketResult[] = [];

  for (const bracket of brackets) {
    if (remainingIncome <= 0) {
      bracketDetails.push({ ...bracket, max: bracket.max === Infinity ? 0 : bracket.max, taxableAmount: 0, taxAmount: 0 });
      continue;
    }
    const bracketWidth = bracket.max === Infinity ? remainingIncome : bracket.max - bracket.min + 1;
    const taxableInBracket = Math.min(remainingIncome, bracketWidth);
    const taxInBracket = taxableInBracket * bracket.rate;
    totalTax += taxInBracket;
    remainingIncome -= taxableInBracket;
    bracketDetails.push({ min: bracket.min, max: bracket.max === Infinity ? 0 : bracket.max, rate: bracket.rate, taxableAmount: taxableInBracket, taxAmount: taxInBracket });
  }

  const taxUSD = totalTax / USD_TO_IQD;
  const effectiveRate = grossIQD > 0 ? (totalTax / grossIQD) * 100 : 0;

  return {
    grossSalaryUSD,
    grossSalaryIQD: grossIQD,
    personalExemption,
    familyExemption,
    totalExemptions,
    taxableIncomeIQD: taxableIncome,
    taxIQD: totalTax,
    taxUSD,
    effectiveRate,
    netSalaryUSD: grossSalaryUSD - taxUSD,
    brackets: bracketDetails,
  };
}

function formatIQD(amount: number): string {
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatUSD(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TaxCalculatorPage() {
  const [salary, setSalary] = useState<number>(3000);
  const [dependents, setDependents] = useState<number>(0);
  const [result, setResult] = useState<TaxResult | null>(null);

  const handleCalculate = () => {
    const r = calculateIraqiTax(salary, dependents);
    setResult(r);
  };

  return (
    <>
      <div className="page-header-section">
        <div className="flex items-center gap-3">
          <Link href="/hr/payroll"><button className="btn-secondary p-2"><ArrowLeft size={16} /></button></Link>
          <div>
            <h2 className="page-title">Iraqi Tax Calculator</h2>
            <p className="page-description">Calculate monthly income tax based on Iraqi tax brackets</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>
              <Calculator size={18} style={{ display: 'inline', marginRight: '8px' }} />
              Tax Input
            </h3>
          </div>
          <div className="tibbna-card-content space-y-4">
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                <DollarSign size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Gross Monthly Salary (USD)
              </label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="tibbna-input"
                min={0}
                step={100}
              />
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                Equivalent: {formatIQD(salary * USD_TO_IQD)} IQD (Rate: 1 USD = {USD_TO_IQD.toLocaleString()} IQD)
              </p>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '6px' }}>
                <Users size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Number of Dependents (max 3)
              </label>
              <input
                type="number"
                min={0}
                max={3}
                value={dependents}
                onChange={(e) => setDependents(Math.min(3, Math.max(0, Number(e.target.value))))}
                className="tibbna-input"
              />
              <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                Family exemption: {formatIQD(Math.min(dependents, 3) * 500000)} IQD
              </p>
            </div>

            <button
              onClick={handleCalculate}
              className="btn-primary w-full flex items-center justify-center gap-2"
              style={{ marginTop: '16px' }}
            >
              <Calculator size={16} /> Calculate Tax
            </button>
          </div>
        </div>

        {/* Result Section */}
        <div className="tibbna-card">
          <div className="tibbna-card-header">
            <h3 className="tibbna-section-title" style={{ margin: 0 }}>Tax Calculation Result</h3>
          </div>
          <div className="tibbna-card-content">
            {!result ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                <Calculator size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <p style={{ fontSize: '14px' }}>Enter salary details and click Calculate</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div style={{ padding: '12px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <p style={{ fontSize: '11px', color: '#1E40AF' }}>Gross Salary</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#1E40AF' }}>${formatUSD(result.grossSalaryUSD)}</p>
                    <p style={{ fontSize: '10px', color: '#3B82F6' }}>{formatIQD(result.grossSalaryIQD)} IQD</p>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <p style={{ fontSize: '11px', color: '#991B1B' }}>Monthly Tax</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#DC2626' }}>${formatUSD(result.taxUSD)}</p>
                    <p style={{ fontSize: '10px', color: '#EF4444' }}>{formatIQD(result.taxIQD)} IQD</p>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <p style={{ fontSize: '11px', color: '#166534' }}>Net Salary</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#16A34A' }}>${formatUSD(result.netSalaryUSD)}</p>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '8px', background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <p style={{ fontSize: '11px', color: '#9A3412' }}>Effective Rate</p>
                    <p style={{ fontSize: '20px', fontWeight: 700, color: '#EA580C' }}>{result.effectiveRate.toFixed(2)}%</p>
                  </div>
                </div>

                {/* Exemptions */}
                <div style={{ padding: '12px', borderRadius: '8px', background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Exemptions</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280' }}>
                    <span>Personal Exemption</span>
                    <span>{formatIQD(result.personalExemption)} IQD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#6B7280' }}>
                    <span>Family Exemption ({dependents} dependents)</span>
                    <span>{formatIQD(result.familyExemption)} IQD</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#374151', borderTop: '1px solid #E5E7EB', paddingTop: '4px', marginTop: '4px' }}>
                    <span>Taxable Income</span>
                    <span>{formatIQD(result.taxableIncomeIQD)} IQD</span>
                  </div>
                </div>

                {/* Bracket Breakdown */}
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Tax Bracket Breakdown</p>
                  <div className="tibbna-table-container">
                    <table className="tibbna-table" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr>
                          <th>Bracket (IQD)</th>
                          <th>Rate</th>
                          <th>Taxable</th>
                          <th>Tax</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.brackets.filter(b => b.taxableAmount > 0).map((b, i) => (
                          <tr key={i}>
                            <td>{formatIQD(b.min)} - {b.max > 0 ? formatIQD(b.max) : '∞'}</td>
                            <td>{(b.rate * 100).toFixed(0)}%</td>
                            <td>{formatIQD(b.taxableAmount)}</td>
                            <td style={{ fontWeight: 600, color: '#DC2626' }}>{formatIQD(b.taxAmount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tax Brackets Reference */}
      <div className="tibbna-card tibbna-section">
        <div className="tibbna-card-header">
          <h3 className="tibbna-section-title" style={{ margin: 0 }}>
            <Info size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Iraqi Tax Brackets Reference (Monthly)
          </h3>
        </div>
        <div className="tibbna-card-content">
          <div className="tibbna-table-container">
            <table className="tibbna-table" style={{ fontSize: '12px' }}>
              <thead>
                <tr>
                  <th>Income Range (IQD/month)</th>
                  <th>Tax Rate</th>
                  <th>Approx USD Range</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>0 - 1,000,000</td><td><span style={{ color: '#16A34A', fontWeight: 600 }}>0%</span></td><td>$0 - $690</td></tr>
                <tr><td>1,000,001 - 2,000,000</td><td><span style={{ color: '#CA8A04', fontWeight: 600 }}>3%</span></td><td>$690 - $1,379</td></tr>
                <tr><td>2,000,001 - 3,333,333</td><td><span style={{ color: '#EA580C', fontWeight: 600 }}>5%</span></td><td>$1,379 - $2,299</td></tr>
                <tr><td>3,333,334 - 8,333,333</td><td><span style={{ color: '#DC2626', fontWeight: 600 }}>10%</span></td><td>$2,299 - $5,747</td></tr>
                <tr><td>8,333,334 - 16,666,666</td><td><span style={{ color: '#991B1B', fontWeight: 600 }}>15%</span></td><td>$5,747 - $11,494</td></tr>
                <tr><td>Above 16,666,666</td><td><span style={{ color: '#7F1D1D', fontWeight: 600 }}>15%</span></td><td>Above $11,494</td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: '12px', padding: '10px', background: '#FFFBEB', borderRadius: '6px', border: '1px solid #FDE68A' }}>
            <p style={{ fontSize: '11px', color: '#92400E' }}>
              <strong>Note:</strong> Exchange Rate: 1 USD = {USD_TO_IQD.toLocaleString()} IQD |
              Personal Exemption: 1,000,000 IQD/month |
              Family Exemption: 500,000 IQD per dependent (max 3)
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
