'use client';

import { useEffect, useState, useMemo } from 'react';

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(parseFloat(String(n)) || 0);

interface Account {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: string;
  normal_balance: string;
  allow_posting: boolean;
  balance: number;
}

interface InvoiceSummary {
  total_revenue: number;
  paid_revenue: number;
  pending_revenue: number;
  claims_revenue: number;
}

type TabKey = 'income' | 'balance' | 'trial' | 'ar_aging' | 'ap_aging' | 'cash_flow';

// ── Period presets ──────────────────────────────────────────────────────────
const iso = (d: Date) => d.toISOString().slice(0, 10);
type Period = { preset: string; from: string; to: string };
function computePreset(preset: string, prev: Period): Period {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case 'this_month':    return { preset, from: iso(new Date(y, m, 1)),     to: iso(new Date(y, m + 1, 0)) };
    case 'last_month':    return { preset, from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case 'this_quarter': { const q = Math.floor(m / 3); return { preset, from: iso(new Date(y, q * 3, 1)), to: iso(new Date(y, q * 3 + 3, 0)) }; }
    case 'this_year':     return { preset, from: `${y}-01-01`, to: `${y}-12-31` };
    case 'last_year':     return { preset, from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case 'all_time':      return { preset, from: '2000-01-01', to: iso(now) };
    case 'custom':        return { preset, from: prev.from, to: prev.to };
    default:              return { preset: 'this_year', from: `${y}-01-01`, to: `${y}-12-31` };
  }
}

export default function ReportsPage() {
  const [tab, setTab] = useState<TabKey>('income');
  const [accounts, setAccounts] = useState<Account[]>([]);        // as-of `to` → Balance Sheet / Trial
  const [periodAccounts, setPeriodAccounts] = useState<Account[]>([]); // from..to activity → Income Statement
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [arAging, setArAging] = useState<any | null>(null);
  const [apAging, setApAging] = useState<any | null>(null);
  const [cashFlow, setCashFlow] = useState<any | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [period, setPeriod] = useState<Period>(() => computePreset('this_year', { preset: '', from: '', to: '' }));
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  // Invalidate the lazy-loaded reports whenever the period changes
  useEffect(() => { setArAging(null); setApAging(null); setCashFlow(null); }, [period.from, period.to]);

  // Lazy-load the aging / cash-flow reports the first time their tab is opened (per period)
  useEffect(() => {
    async function loadExtra() {
      const q = `from=${period.from}&to=${period.to}`;
      if (tab === 'ar_aging' && !arAging) {
        setSubLoading(true);
        try { const r = await fetch(`/api/reports/ar-aging?as_of=${period.to}`); if (r.ok) setArAging(await r.json()); } catch {}
        setSubLoading(false);
      } else if (tab === 'ap_aging' && !apAging) {
        setSubLoading(true);
        try { const r = await fetch(`/api/reports/ap-aging?as_of=${period.to}`); if (r.ok) setApAging(await r.json()); } catch {}
        setSubLoading(false);
      } else if (tab === 'cash_flow' && !cashFlow) {
        setSubLoading(true);
        try { const r = await fetch(`/api/reports/cash-flow?${q}`); if (r.ok) setCashFlow(await r.json()); } catch {}
        setSubLoading(false);
      }
    }
    loadExtra();
  }, [tab, arAging, apAging, cashFlow, period.from, period.to]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accsRes, periodRes, invRes] = await Promise.all([
          fetch(`/api/finance/accounts?to=${period.to}`),                 // as-of → Balance Sheet / Trial
          fetch(`/api/finance/accounts?from=${period.from}&to=${period.to}`), // activity → Income Statement
          fetch('/api/invoices?page=1&limit=1000'),
        ]);
        if (accsRes.ok) {
          const d = await accsRes.json();
          setAccounts(d.data || []);
        }
        if (periodRes.ok) {
          const d = await periodRes.json();
          setPeriodAccounts(d.data || []);
        }
        if (invRes.ok) {
          const d = await invRes.json();
          const invoices: any[] = d.data || d.invoices || [];
          const totalRevenue  = invoices.reduce((s: number, i: any) => s + (parseFloat(String(i.total_amount)) || 0), 0);
          const paidRevenue   = invoices.filter((i: any) => i.status === 'PAID').reduce((s: number, i: any) => s + (parseFloat(String(i.amount_paid)) || 0), 0);
          const pendingRevenue = invoices.filter((i: any) => i.status !== 'PAID' && i.status !== 'CANCELLED').reduce((s: number, i: any) => s + (parseFloat(String(i.balance_due)) || 0), 0);
          const claimsRevenue = invoices.reduce((s: number, i: any) => s + (parseFloat(String(i.insurance_coverage_amount)) || 0), 0);
          setInvoiceSummary({ total_revenue: totalRevenue, paid_revenue: paidRevenue, pending_revenue: pendingRevenue, claims_revenue: claimsRevenue });
        }
      } catch (e) {
        console.error('Failed to load report data', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period.from, period.to]);

  const byType = useMemo(() => {
    const g: Record<string, Account[]> = {};
    accounts.forEach(a => { if (!g[a.account_type]) g[a.account_type] = []; g[a.account_type].push(a); });
    return g;
  }, [accounts]);

  // Income Statement is a PERIOD report → use activity within from..to
  const periodByType = useMemo(() => {
    const g: Record<string, Account[]> = {};
    periodAccounts.forEach(a => { if (!g[a.account_type]) g[a.account_type] = []; g[a.account_type].push(a); });
    return g;
  }, [periodAccounts]);

  const getBalance = (code: string) => {
    const a = accounts.find(acc => acc.account_number === code);
    return a ? (parseFloat(String(a.balance)) || 0) : 0;
  };

  const trialRows = useMemo(() =>
    accounts
      .filter(a => a.allow_posting && (parseFloat(String(a.balance)) || 0) !== 0)
      .map(a => {
        const bal = parseFloat(String(a.balance)) || 0;
        return {
          number: a.account_number,
          name: a.account_name,
          type: a.account_type,
          debit:  a.normal_balance === 'DEBIT'  ? Math.abs(bal) : (bal < 0 ? Math.abs(bal) : 0),
          credit: a.normal_balance === 'CREDIT' ? Math.abs(bal) : (bal < 0 ? Math.abs(bal) : 0),
        };
      })
      .sort((a, b) => a.number.localeCompare(b.number)),
    [accounts]
  );

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b font-semibold text-sm">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );

  const Row = ({ label, value, bold, indent, color }: {
    label: string; value: number; bold?: boolean; indent?: boolean; color?: string;
  }) => (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? 'font-bold border-t pt-2 mt-1' : ''}`}>
      <span className={`${indent ? 'ml-6' : ''} ${bold ? '' : 'text-gray-600'}`}>{label}</span>
      <span className={`font-medium ${color || ''}`}>{fmt(Math.abs(value))} IQD</span>
    </div>
  );

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
        {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-32 bg-gray-100 rounded-lg" />)}
      </div>
    );
  }

  // ── Income Statement — sourced from the GENERAL LEDGER (ties to Trial Balance) ──
  // Revenue = posted REVENUE account balances; Expenses = posted EXPENSE balances.
  const revenueAccounts = (periodByType['REVENUE'] || []).filter(a => Math.abs(parseFloat(String(a.balance)) || 0) > 0);
  const expenseAccounts = (periodByType['EXPENSE'] || []).filter(a => Math.abs(parseFloat(String(a.balance)) || 0) > 0);
  const totalRevenue    = revenueAccounts.reduce((s, a) => s + Math.abs(parseFloat(String(a.balance)) || 0), 0);
  const totalExpenses   = expenseAccounts.reduce((s, a) => s + Math.abs(parseFloat(String(a.balance)) || 0), 0);
  const netIncome       = totalRevenue - totalExpenses;

  // Informational invoice figures (shown as context, not the GL totals)
  const invoicedTotal  = invoiceSummary?.total_revenue || 0;
  const cashRevenue    = invoiceSummary?.paid_revenue || 0;

  // ── Balance Sheet ──
  const assetAccounts  = byType['ASSET'] || [];
  const liabAccounts   = byType['LIABILITY'] || [];
  const equityAccounts = byType['EQUITY'] || [];
  const totalAssets     = assetAccounts.reduce((s, a) => s + (parseFloat(String(a.balance)) || 0), 0);
  const totalLiabs      = liabAccounts.reduce((s, a) => s + (parseFloat(String(a.balance)) || 0), 0);
  const equityFromAccts = equityAccounts.reduce((s, a) => s + (parseFloat(String(a.balance)) || 0), 0);
  // Net income flows into equity as Current Year Earnings (closing entry not yet booked)
  const currentYearEarnings = netIncome;
  const totalEquity     = equityFromAccts + currentYearEarnings;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-500 text-sm">Income, Balance Sheet, Trial Balance, AR/AP Aging, Cash Flow — as of {today}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 print:hidden"
        >
          🖨 Print / PDF
        </button>
      </div>

      {/* Reporting period selector */}
      <div className="bg-white border rounded-lg p-3 flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Reporting Period</label>
          <select
            value={period.preset}
            onChange={e => setPeriod(p => computePreset(e.target.value, p))}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
            <option value="all_time">All Time</option>
            <option value="custom">Custom…</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={period.from}
            onChange={e => setPeriod(p => ({ ...p, preset: 'custom', from: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={period.to}
            onChange={e => setPeriod(p => ({ ...p, preset: 'custom', to: e.target.value }))}
            className="px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="text-xs text-gray-500 pb-2">
          {tab === 'income' || tab === 'cash_flow'
            ? <>Period activity: <b>{fmtDate(period.from)} → {fmtDate(period.to)}</b></>
            : <>As of: <b>{fmtDate(period.to)}</b> (point-in-time)</>}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap print:hidden">
        {[
          { key: 'income', label: 'Income Statement' },
          { key: 'balance', label: 'Balance Sheet' },
          { key: 'trial',   label: 'Trial Balance' },
          { key: 'ar_aging', label: 'AR Aging' },
          { key: 'ap_aging', label: 'AP Aging' },
          { key: 'cash_flow', label: 'Cash Flow' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Income Statement */}
      {tab === 'income' && (
        <div className="max-w-2xl space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Income Statement</h2>
            <p className="text-xs text-gray-500">General Ledger (accrual basis) · {fmtDate(period.from)} → {fmtDate(period.to)}</p>
          </div>
          <Section title="Revenue (from General Ledger)">
            {revenueAccounts.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No revenue posted to the ledger yet.</p>
            ) : (
              revenueAccounts
                .sort((a, b) => a.account_number.localeCompare(b.account_number))
                .map(a => (
                  <Row key={a.account_id} label={a.account_name} value={Math.abs(parseFloat(String(a.balance)) || 0)} indent />
                ))
            )}
            <Row label="Total Revenue" value={totalRevenue} bold color="text-gray-900" />
          </Section>
          <Section title="Expenses (from Chart of Accounts)">
            {expenseAccounts.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No expense account balances recorded yet.</p>
            ) : (
              expenseAccounts
                .sort((a, b) => a.account_number.localeCompare(b.account_number))
                .map(a => (
                  <Row key={a.account_id} label={a.account_name} value={parseFloat(String(a.balance)) || 0} indent />
                ))
            )}
            <Row label="Total Expenses" value={totalExpenses} bold color="text-gray-900" />
          </Section>
          <div className="bg-white rounded-lg border p-4">
            <Row
              label="Net Income / (Loss)"
              value={netIncome}
              bold
              color={netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}
            />
          </div>
        </div>
      )}

      {/* Balance Sheet */}
      {tab === 'balance' && (
        <div className="max-w-2xl space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Balance Sheet</h2>
            <p className="text-xs text-gray-500">As of {fmtDate(period.to)}</p>
          </div>
          <Section title="Assets">
            {assetAccounts.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No asset account balances recorded.</p>
            ) : (
              assetAccounts
                .sort((a, b) => a.account_number.localeCompare(b.account_number))
                .map(a => (
                  <Row key={a.account_id} label={a.account_name} value={parseFloat(String(a.balance)) || 0} indent />
                ))
            )}
            <Row label="TOTAL ASSETS" value={totalAssets} bold color="text-gray-900" />
          </Section>
          <Section title="Liabilities">
            {liabAccounts.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No liability account balances recorded.</p>
            ) : (
              liabAccounts
                .sort((a, b) => a.account_number.localeCompare(b.account_number))
                .map(a => (
                  <Row key={a.account_id} label={a.account_name} value={parseFloat(String(a.balance)) || 0} indent />
                ))
            )}
            <Row label="TOTAL LIABILITIES" value={totalLiabs} bold color="text-gray-900" />
          </Section>
          <Section title="Equity">
            {equityAccounts
              .sort((a, b) => a.account_number.localeCompare(b.account_number))
              .map(a => (
                <Row key={a.account_id} label={a.account_name} value={parseFloat(String(a.balance)) || 0} indent />
              ))}
            {/* Net income for the period flows into equity until a closing entry is booked */}
            <Row label="Current Year Earnings" value={currentYearEarnings} indent
                 color={currentYearEarnings >= 0 ? 'text-emerald-600' : 'text-red-600'} />
            <Row label="TOTAL EQUITY" value={totalEquity} bold color="text-gray-900" />
          </Section>
          <div className="bg-white rounded-lg border p-4 space-y-1">
            <Row label="Total Liabilities + Equity" value={totalLiabs + totalEquity} bold color="text-gray-900" />
            {Math.abs(totalAssets - (totalLiabs + totalEquity)) < 1 ? (
              <p className="text-xs text-center text-emerald-600 font-medium mt-2">Balanced ✓ (Assets = Liabilities + Equity)</p>
            ) : (
              <p className="text-xs text-center text-amber-500 font-medium mt-2">
                Difference: {fmt(Math.abs(totalAssets - totalLiabs - totalEquity))} IQD
              </p>
            )}
          </div>
        </div>
      )}

      {/* Trial Balance */}
      {tab === 'trial' && (
        <div className="max-w-3xl">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">Trial Balance</h2>
            <p className="text-xs text-gray-500">As of {fmtDate(period.to)}</p>
          </div>
          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Account #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Account Name</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Debit (IQD)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Credit (IQD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trialRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No accounts with non-zero balances. Post journal entries to see trial balance.
                    </td>
                  </tr>
                ) : (
                  trialRows.map(row => (
                    <tr key={row.number} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-mono text-xs">{row.number}</td>
                      <td className="px-4 py-2 font-medium">{row.name}</td>
                      <td className="px-4 py-2 text-center">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {row.debit > 0 ? fmt(row.debit) : ''}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-600">
                        {row.credit > 0 ? fmt(row.credit) : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50 border-t font-bold">
                <tr>
                  <td colSpan={3} className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-gray-900">
                    {fmt(trialRows.reduce((s, r) => s + r.debit, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {fmt(trialRows.reduce((s, r) => s + r.credit, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* AR Aging */}
      {tab === 'ar_aging' && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold">Accounts Receivable Aging</h2>
            <p className="text-xs text-gray-500">Outstanding patient invoices by age — as of {fmtDate(period.to)}</p>
          </div>
          {subLoading && !arAging ? (
            <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />
          ) : !arAging || arAging.totals.total === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-sm text-gray-400">
              No outstanding receivables. All invoices are paid. ✓
            </div>
          ) : (
            <AgingTable
              entityLabel="Patient"
              columns={[
                { key: 'current', label: 'Current' },
                { key: 'd1_30', label: '1–30 days' },
                { key: 'd31_60', label: '31–60 days' },
                { key: 'd61_90', label: '61–90 days' },
                { key: 'd90_plus', label: '90+ days' },
              ]}
              rows={arAging.by_patient.map((p: any) => ({ name: p.patient_name, ...p }))}
              totals={arAging.totals}
            />
          )}
        </div>
      )}

      {/* AP Aging */}
      {tab === 'ap_aging' && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold">Accounts Payable Aging</h2>
            <p className="text-xs text-gray-500">Supplier balances overdue by due date — as of {fmtDate(period.to)}</p>
          </div>
          {subLoading && !apAging ? (
            <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />
          ) : !apAging || apAging.totals.total === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center text-sm text-gray-400">
              No outstanding payables. All supplier invoices are settled. ✓
            </div>
          ) : (
            <AgingTable
              entityLabel="Vendor"
              columns={[
                { key: 'not_due', label: 'Not Due' },
                { key: 'd1_30', label: '1–30 overdue' },
                { key: 'd31_60', label: '31–60 overdue' },
                { key: 'd61_90', label: '61–90 overdue' },
                { key: 'd90_plus', label: '90+ overdue' },
              ]}
              rows={apAging.by_vendor.map((v: any) => ({ name: v.vendor_name, ...v }))}
              totals={apAging.totals}
            />
          )}
        </div>
      )}

      {/* Cash Flow */}
      {tab === 'cash_flow' && (
        <div className="max-w-2xl space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold">Cash Flow Statement</h2>
            <p className="text-xs text-gray-500">
              {cashFlow ? `${cashFlow.from} → ${cashFlow.to}` : ''} · from cash & bank ledger movements
            </p>
          </div>
          {subLoading && !cashFlow ? (
            <div className="animate-pulse h-40 bg-gray-100 rounded-lg" />
          ) : !cashFlow ? (
            <div className="bg-white rounded-lg border p-8 text-center text-sm text-gray-400">No cash movements.</div>
          ) : (
            <>
              <div className="bg-white rounded-lg border p-4">
                <Row label="Opening Cash Balance" value={cashFlow.opening_balance} bold color="text-gray-900" />
              </div>
              {([
                ['Operating Activities', cashFlow.operating],
                ['Investing Activities', cashFlow.investing],
                ['Financing Activities', cashFlow.financing],
              ] as [string, any][]).map(([title, sec]) => (
                <Section key={title} title={title}>
                  {sec.lines.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No activity.</p>
                  ) : (
                    sec.lines.map((l: any, i: number) => (
                      <Row key={i} label={l.label} value={l.net} indent
                           color={l.net >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                    ))
                  )}
                  <Row label={`Net cash from ${title.split(' ')[0].toLowerCase()}`} value={sec.subtotal} bold
                       color={sec.subtotal >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                </Section>
              ))}
              <div className="bg-white rounded-lg border p-4 space-y-1">
                <Row label="Net Change in Cash" value={cashFlow.net_change} bold
                     color={cashFlow.net_change >= 0 ? 'text-emerald-600' : 'text-red-600'} />
                <Row label="Closing Cash Balance" value={cashFlow.closing_balance} bold color="text-gray-900" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Reusable aging table (AR + AP) ──────────────────────────────────────────
function AgingTable({ entityLabel, columns, rows, totals }: {
  entityLabel: string;
  columns: { key: string; label: string }[];
  rows: any[];
  totals: Record<string, number>;
}) {
  const f = (n: number | string) => new Intl.NumberFormat('en-IQ').format(parseFloat(String(n)) || 0);
  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">{entityLabel}</th>
            {columns.map(c => (
              <th key={c.key} className="text-right px-4 py-3 font-medium text-gray-600">{c.label}</th>
            ))}
            <th className="text-right px-4 py-3 font-medium text-gray-900">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium">{r.name}</td>
              {columns.map(c => (
                <td key={c.key} className="px-4 py-2 text-right text-gray-600">
                  {r[c.key] > 0 ? f(r[c.key]) : '—'}
                </td>
              ))}
              <td className="px-4 py-2 text-right font-semibold text-gray-900">{f(r.total)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-50 border-t font-bold">
          <tr>
            <td className="px-4 py-3">Total</td>
            {columns.map(c => (
              <td key={c.key} className="px-4 py-3 text-right text-gray-900">{f(totals[c.key])}</td>
            ))}
            <td className="px-4 py-3 text-right text-gray-900">{f(totals.total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
