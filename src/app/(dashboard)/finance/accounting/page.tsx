'use client';

import { useEffect, useState, useMemo } from 'react';
import { BookOpen, Eye, Search, Plus, X } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { ChartOfAccount, CostCenter, JournalEntry } from '@/types/finance';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function AccountingPage() {
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [tab, setTab] = useState<'coa' | 'cost_centers' | 'journal'>('coa');
  const [mounted, setMounted] = useState(false);
  const [viewJE, setViewJE] = useState<JournalEntry | null>(null);

  useEffect(() => {
    financeStore.initialize();
    setAccounts(financeStore.getChartOfAccounts());
    setCostCenters(financeStore.getCostCenters());
    setJournals(financeStore.getJournalEntries());
    setMounted(true);
  }, []);

  const accountsByType = useMemo(() => {
    const groups: Record<string, ChartOfAccount[]> = {};
    accounts.forEach(a => {
      if (!groups[a.account_type]) groups[a.account_type] = [];
      groups[a.account_type].push(a);
    });
    return groups;
  }, [accounts]);

  const typeLabel: Record<string, string> = { ASSET: 'Assets', LIABILITY: 'Liabilities', EQUITY: 'Equity', REVENUE: 'Revenue', EXPENSE: 'Expenses' };
  const typeColor: Record<string, string> = { ASSET: 'border-blue-200 bg-blue-50', LIABILITY: 'border-red-200 bg-red-50', EQUITY: 'border-purple-200 bg-purple-50', REVENUE: 'border-emerald-200 bg-emerald-50', EXPENSE: 'border-amber-200 bg-amber-50' };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Accounting</h1><p className="text-gray-500 text-sm">Chart of Accounts, Cost Centers, and Journal Entries</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Accounts', value: accounts.length, color: 'text-gray-900' },
          { label: 'Cost Centers', value: costCenters.length, color: 'text-gray-900' },
          { label: 'Journal Entries', value: journals.length, color: 'text-gray-900' },
          { label: 'Posted Entries', value: journals.filter(j => j.posted).length, color: 'text-gray-900' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className={`text-lg font-bold ${k.color} mt-1`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('coa')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'coa' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Chart of Accounts</button>
        <button onClick={() => setTab('cost_centers')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'cost_centers' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Cost Centers</button>
        <button onClick={() => setTab('journal')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'journal' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Journal Entries</button>
      </div>

      {tab === 'coa' && (
        <div className="space-y-4">
          {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(type => {
            const accs = accountsByType[type] || [];
            if (accs.length === 0) return null;
            return (
              <div key={type} className={`rounded-lg border-2 ${typeColor[type]} overflow-hidden`}>
                <div className="px-4 py-3 font-semibold text-sm">{typeLabel[type]} ({accs.length})</div>
                <div className="bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-y">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Account #</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Name (AR)</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Name (EN)</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600 text-xs">Normal</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600 text-xs">Posting</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">Balance (IQD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {accs.sort((a, b) => a.account_number.localeCompare(b.account_number)).map(a => (
                        <tr key={a.account_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{a.account_number}</td>
                          <td className="px-4 py-2 font-medium">{a.parent_account_id ? <span className="ml-4">{a.account_name_ar}</span> : a.account_name_ar}</td>
                          <td className="px-4 py-2 text-gray-500">{a.account_name_en || '-'}</td>
                          <td className="px-4 py-2 text-center"><span className={`text-[10px] px-1.5 py-0.5 rounded ${a.normal_balance === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{a.normal_balance}</span></td>
                          <td className="px-4 py-2 text-center">{a.allow_posting ? <span className="text-emerald-500 text-xs">Yes</span> : <span className="text-gray-400 text-xs">No</span>}</td>
                          <td className="px-4 py-2 text-right font-medium">{a.balance !== 0 ? fmt(Math.abs(a.balance)) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'cost_centers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {costCenters.map(cc => {
            const pct = cc.annual_budget > 0 ? Math.round((cc.actual_spending / cc.annual_budget) * 100) : 0;
            return (
              <div key={cc.cost_center_id} className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{cc.name_ar}</div>
                    {cc.name_en && <div className="text-xs text-gray-500">{cc.name_en}</div>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cc.center_type === 'PROFIT_CENTER' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{cc.center_type.replace('_', ' ')}</span>
                </div>
                <div className="text-xs text-gray-400 mb-3">{cc.cost_center_code}</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Annual Budget</span><span className="font-medium">{fmt(cc.annual_budget)} IQD</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Actual Spending</span><span className="font-medium">{fmt(cc.actual_spending)} IQD</span></div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="text-right text-xs font-medium">{pct}% utilized</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'journal' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Entry #</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Debits (IQD)</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Credits (IQD)</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...journals].sort((a, b) => b.entry_date.localeCompare(a.entry_date)).map(je => (
                  <tr key={je.entry_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{je.entry_number}</td>
                    <td className="px-4 py-3 text-gray-600">{je.entry_date}</td>
                    <td className="px-4 py-3 max-w-[250px] truncate">{je.description_ar}</td>
                    <td className="px-4 py-3 text-center"><span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">{je.entry_type}</span></td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(je.total_debits)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-600">{fmt(je.total_credits)}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${je.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{je.status}</span></td>
                    <td className="px-4 py-3 text-center"><button onClick={() => setViewJE(je)} className="p-1.5 hover:bg-gray-100 rounded"><Eye size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Journal Entry Modal */}
      {viewJE && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewJE(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between">
              <div><h2 className="text-lg font-bold">{viewJE.entry_number}</h2><p className="text-xs text-gray-500">{viewJE.entry_date} &middot; {viewJE.entry_type}</p></div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium h-fit ${viewJE.status === 'POSTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{viewJE.status}</span>
            </div>
            <div className="p-6">
              <p className="text-sm mb-4">{viewJE.description_ar}</p>
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Account</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Debit</th>
                    <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {financeStore.getLinesByEntry(viewJE.entry_id).map(line => (
                    <tr key={line.line_id}>
                      <td className="px-3 py-2"><div className="font-medium">{line.account_name_ar}</div><div className="text-xs text-gray-400">{line.account_number}</div>{line.line_description_ar && <div className="text-xs text-gray-500">{line.line_description_ar}</div>}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">{line.debit_amount > 0 ? fmt(line.debit_amount) : ''}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-600">{line.credit_amount > 0 ? fmt(line.credit_amount) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t font-bold">
                  <tr>
                    <td className="px-3 py-2">Total</td>
                    <td className="px-3 py-2 text-right text-gray-900">{fmt(viewJE.total_debits)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{fmt(viewJE.total_credits)}</td>
                  </tr>
                </tfoot>
              </table>
              <div className="mt-2 text-xs text-center">{viewJE.is_balanced ? <span className="text-emerald-600">Balanced</span> : <span className="text-red-600">Not Balanced</span>}</div>
            </div>
            <div className="p-4 border-t flex justify-end"><button onClick={() => setViewJE(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
