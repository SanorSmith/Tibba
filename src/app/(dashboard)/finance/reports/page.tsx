'use client';

import { useEffect, useState, useMemo } from 'react';
import { BarChart3, DollarSign, TrendingUp, TrendingDown, FileText, Download } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function ReportsPage() {
  const [tab, setTab] = useState<'income' | 'balance' | 'cashflow' | 'trial'>('income');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { financeStore.initialize(); setMounted(true); }, []);

  const incomeData = useMemo(() => {
    if (!mounted) return null;
    const invoices = financeStore.getInvoices();
    const items = financeStore.getInvoiceItems();
    const pos = financeStore.getPurchaseOrders();

    const revenueByCategory: Record<string, number> = {};
    items.forEach(item => {
      const cat = item.service_category || 'OTHER';
      revenueByCategory[cat] = (revenueByCategory[cat] || 0) + item.line_total;
    });

    const totalRevenue = invoices.reduce((s, i) => s + i.total_amount, 0);
    const totalPurchases = pos.reduce((s, p) => s + p.total_amount, 0);
    const accounts = financeStore.getChartOfAccounts();
    const salaries = accounts.find(a => a.account_number === '5100')?.balance || 120000000;
    const utilities = accounts.find(a => a.account_number === '5400')?.balance || 15000000;
    const depreciation = accounts.find(a => a.account_number === '5500')?.balance || 35000000;
    const maintenance = accounts.find(a => a.account_number === '5600')?.balance || 8000000;
    const otherExp = accounts.find(a => a.account_number === '5900')?.balance || 5000000;
    const totalExpenses = salaries + totalPurchases + utilities + depreciation + maintenance + otherExp;

    return {
      revenue: { ...revenueByCategory, total: totalRevenue },
      expenses: { salaries, medical_supplies: totalPurchases * 0.3, pharmaceuticals: totalPurchases * 0.5, utilities, depreciation, maintenance, other: otherExp + totalPurchases * 0.2, total: totalExpenses },
      netIncome: totalRevenue - totalExpenses,
    };
  }, [mounted]);

  const balanceData = useMemo(() => {
    if (!mounted) return null;
    const accounts = financeStore.getChartOfAccounts();
    const getBalance = (num: string) => accounts.find(a => a.account_number === num)?.balance || 0;

    return {
      assets: {
        current: {
          cash: getBalance('1100'), ar_patients: getBalance('1200'), ar_insurance: getBalance('1210'),
          inventory: getBalance('1300'), prepaid: getBalance('1400'),
        },
        fixed: {
          equipment: getBalance('1510'), furniture: getBalance('1520'), vehicles: getBalance('1530'),
          building: getBalance('1540'), accum_dep: getBalance('1550'),
        },
      },
      liabilities: {
        current: {
          ap_suppliers: getBalance('2100'), accrued: getBalance('2200'),
          shares_payable: getBalance('2300'), taxes: getBalance('2400'),
        },
        long_term: { loans: getBalance('2510') },
      },
      equity: { capital: getBalance('3100'), retained: getBalance('3200'), current_profit: getBalance('3300') },
    };
  }, [mounted]);

  const trialBalance = useMemo(() => {
    if (!mounted) return [];
    return financeStore.getChartOfAccounts()
      .filter(a => a.allow_posting && a.balance !== 0)
      .map(a => ({
        number: a.account_number, name_ar: a.account_name_ar, name_en: a.account_name_en,
        type: a.account_type,
        debit: a.normal_balance === 'DEBIT' ? Math.abs(a.balance) : (a.balance < 0 ? Math.abs(a.balance) : 0),
        credit: a.normal_balance === 'CREDIT' ? Math.abs(a.balance) : (a.balance < 0 ? Math.abs(a.balance) : 0),
      }))
      .sort((a, b) => a.number.localeCompare(b.number));
  }, [mounted]);

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );

  const Row = ({ label, value, bold, indent, color }: { label: string; value: number; bold?: boolean; indent?: boolean; color?: string }) => (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? 'font-bold border-t pt-2 mt-1' : ''}`}>
      <span className={`${indent ? 'ml-6' : ''} ${bold ? '' : 'text-gray-600'}`}>{label}</span>
      <span className={`font-medium ${color || ''}`}>{fmt(Math.abs(value))} IQD</span>
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1><p className="text-gray-500 text-sm">Income Statement, Balance Sheet, Cash Flow, Trial Balance</p></div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {[
          { key: 'income', label: 'Income Statement' },
          { key: 'balance', label: 'Balance Sheet' },
          { key: 'cashflow', label: 'Cash Flow' },
          { key: 'trial', label: 'Trial Balance' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'income' && incomeData && (
        <div className="max-w-2xl space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Income Statement</h2>
            <p className="text-xs text-gray-500">For the period ending March 31, 2024</p>
          </div>
          <Section title="Revenue">
            {Object.entries(incomeData.revenue).filter(([k]) => k !== 'total').map(([k, v]) => (
              <Row key={k} label={k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={v as number} indent />
            ))}
            <Row label="Total Revenue" value={incomeData.revenue.total} bold color="text-emerald-600" />
          </Section>
          <Section title="Expenses">
            <Row label="Salaries & Wages" value={incomeData.expenses.salaries} indent />
            <Row label="Medical Supplies" value={incomeData.expenses.medical_supplies} indent />
            <Row label="Pharmaceuticals" value={incomeData.expenses.pharmaceuticals} indent />
            <Row label="Utilities" value={incomeData.expenses.utilities} indent />
            <Row label="Depreciation" value={incomeData.expenses.depreciation} indent />
            <Row label="Maintenance" value={incomeData.expenses.maintenance} indent />
            <Row label="Other Expenses" value={incomeData.expenses.other} indent />
            <Row label="Total Expenses" value={incomeData.expenses.total} bold color="text-red-600" />
          </Section>
          <div className="bg-white rounded-lg border p-4">
            <Row label="Net Income" value={incomeData.netIncome} bold color={incomeData.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'} />
          </div>
        </div>
      )}

      {tab === 'balance' && balanceData && (
        <div className="max-w-2xl space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Balance Sheet</h2>
            <p className="text-xs text-gray-500">As of March 31, 2024</p>
          </div>
          <Section title="Assets">
            <div className="text-xs font-semibold text-gray-500 mb-1 mt-1">Current Assets</div>
            <Row label="Cash and Bank" value={balanceData.assets.current.cash} indent />
            <Row label="Accounts Receivable - Patients" value={balanceData.assets.current.ar_patients} indent />
            <Row label="Accounts Receivable - Insurance" value={balanceData.assets.current.ar_insurance} indent />
            <Row label="Inventory" value={balanceData.assets.current.inventory} indent />
            <Row label="Prepaid Expenses" value={balanceData.assets.current.prepaid} indent />
            <Row label="Total Current Assets" value={Object.values(balanceData.assets.current).reduce((s, v) => s + v, 0)} bold />
            <div className="text-xs font-semibold text-gray-500 mb-1 mt-3">Non-Current Assets</div>
            <Row label="Medical Equipment" value={balanceData.assets.fixed.equipment} indent />
            <Row label="Furniture & Fixtures" value={balanceData.assets.fixed.furniture} indent />
            <Row label="Vehicles" value={balanceData.assets.fixed.vehicles} indent />
            <Row label="Building" value={balanceData.assets.fixed.building} indent />
            <Row label="Accumulated Depreciation" value={balanceData.assets.fixed.accum_dep} indent color="text-red-500" />
            <Row label="Total Non-Current Assets" value={Object.values(balanceData.assets.fixed).reduce((s, v) => s + v, 0)} bold />
            <Row label="TOTAL ASSETS" value={Object.values(balanceData.assets.current).reduce((s, v) => s + v, 0) + Object.values(balanceData.assets.fixed).reduce((s, v) => s + v, 0)} bold color="text-blue-600" />
          </Section>
          <Section title="Liabilities">
            <div className="text-xs font-semibold text-gray-500 mb-1 mt-1">Current Liabilities</div>
            <Row label="Accounts Payable - Suppliers" value={balanceData.liabilities.current.ap_suppliers} indent />
            <Row label="Accrued Expenses" value={balanceData.liabilities.current.accrued} indent />
            <Row label="Stakeholder Shares Payable" value={balanceData.liabilities.current.shares_payable} indent />
            <Row label="Taxes Payable" value={balanceData.liabilities.current.taxes} indent />
            <Row label="Total Current Liabilities" value={Object.values(balanceData.liabilities.current).reduce((s, v) => s + v, 0)} bold />
            <div className="text-xs font-semibold text-gray-500 mb-1 mt-3">Long-term Liabilities</div>
            <Row label="Long-term Loans" value={balanceData.liabilities.long_term.loans} indent />
            <Row label="TOTAL LIABILITIES" value={Object.values(balanceData.liabilities.current).reduce((s, v) => s + v, 0) + balanceData.liabilities.long_term.loans} bold color="text-red-600" />
          </Section>
          <Section title="Equity">
            <Row label="Paid-in Capital" value={balanceData.equity.capital} indent />
            <Row label="Retained Earnings" value={balanceData.equity.retained} indent />
            <Row label="Current Year Profit" value={balanceData.equity.current_profit} indent />
            <Row label="TOTAL EQUITY" value={Object.values(balanceData.equity).reduce((s, v) => s + v, 0)} bold color="text-purple-600" />
          </Section>
        </div>
      )}

      {tab === 'cashflow' && (
        <div className="max-w-2xl space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Cash Flow Statement</h2>
            <p className="text-xs text-gray-500">For the period ending March 31, 2024</p>
          </div>
          <Section title="Operating Activities">
            <Row label="Net Income" value={incomeData?.netIncome || 0} indent />
            <Row label="Depreciation (add back)" value={35000000} indent />
            <Row label="Change in Receivables" value={-23715000} indent color="text-red-500" />
            <Row label="Change in Inventory" value={-61450000} indent color="text-red-500" />
            <Row label="Change in Payables" value={60250000} indent color="text-emerald-500" />
            <Row label="Net Cash from Operations" value={(incomeData?.netIncome || 0) + 35000000 - 23715000 - 61450000 + 60250000} bold />
          </Section>
          <Section title="Investing Activities">
            <Row label="Equipment Purchases" value={-150000000} indent color="text-red-500" />
            <Row label="Net Cash from Investing" value={-150000000} bold />
          </Section>
          <Section title="Financing Activities">
            <Row label="Loan Proceeds" value={500000000} indent color="text-emerald-500" />
            <Row label="Net Cash from Financing" value={500000000} bold />
          </Section>
          <div className="bg-white rounded-lg border p-4 space-y-1">
            <Row label="Net Change in Cash" value={(incomeData?.netIncome || 0) + 35000000 - 23715000 - 61450000 + 60250000 - 150000000 + 500000000} bold />
            <Row label="Beginning Cash" value={0} indent />
            <Row label="Ending Cash" value={185000000} bold color="text-blue-600" />
          </div>
        </div>
      )}

      {tab === 'trial' && (
        <div className="max-w-3xl">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Trial Balance</h2>
            <p className="text-xs text-gray-500">As of March 31, 2024</p>
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Account #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Account Name</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-blue-600">Debit (IQD)</th>
                  <th className="text-right px-4 py-3 font-medium text-red-600">Credit (IQD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trialBalance.map(row => (
                  <tr key={row.number} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{row.number}</td>
                    <td className="px-4 py-2"><div className="font-medium">{row.name_ar}</div>{row.name_en && <div className="text-xs text-gray-400">{row.name_en}</div>}</td>
                    <td className="px-4 py-2 text-center"><span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{row.type}</span></td>
                    <td className="px-4 py-2 text-right font-medium text-blue-600">{row.debit > 0 ? fmt(row.debit) : ''}</td>
                    <td className="px-4 py-2 text-right font-medium text-red-600">{row.credit > 0 ? fmt(row.credit) : ''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-blue-600">{fmt(trialBalance.reduce((s, r) => s + r.debit, 0))}</td>
                  <td className="px-4 py-3 text-right text-red-600">{fmt(trialBalance.reduce((s, r) => s + r.credit, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
