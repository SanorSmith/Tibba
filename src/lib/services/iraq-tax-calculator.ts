/**
 * Iraqi Income Tax Calculator
 * 
 * Tax Brackets (IQD/month):
 * 0 - 1,000,000: 0%
 * 1,000,001 - 2,000,000: 3%
 * 2,000,001 - 3,333,333: 5%
 * 3,333,334 - 8,333,333: 10%
 * 8,333,334 - 16,666,666: 15%
 * Above 16,666,666: 15%
 * 
 * Exemptions:
 * - Personal exemption: 1,000,000 IQD/month
 * - Family exemption: 500,000 per dependent (max 3)
 */

export const USD_TO_IQD = 1450;

export interface TaxCalculationResult {
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
  brackets: Array<{
    min: number;
    max: number;
    rate: number;
    taxableAmount: number;
    taxAmount: number;
  }>;
}

export function calculateIraqiTax(grossSalaryUSD: number, dependents: number = 0): TaxCalculationResult {
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
  const bracketDetails: TaxCalculationResult['brackets'] = [];

  for (const bracket of brackets) {
    if (remainingIncome <= 0) {
      bracketDetails.push({
        ...bracket,
        max: bracket.max === Infinity ? 0 : bracket.max,
        taxableAmount: 0,
        taxAmount: 0,
      });
      continue;
    }

    const bracketWidth = bracket.max === Infinity
      ? remainingIncome
      : bracket.max - bracket.min + 1;
    const taxableInBracket = Math.min(remainingIncome, bracketWidth);
    const taxInBracket = taxableInBracket * bracket.rate;

    totalTax += taxInBracket;
    remainingIncome -= taxableInBracket;

    bracketDetails.push({
      min: bracket.min,
      max: bracket.max === Infinity ? 0 : bracket.max,
      rate: bracket.rate,
      taxableAmount: taxableInBracket,
      taxAmount: taxInBracket,
    });
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
