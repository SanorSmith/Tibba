'use client';

import { useEffect, useState, useMemo } from 'react';
import { Eye, RefreshCw, Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(parseFloat(String(n)) || 0);

interface Account {
  account_id: string;
  account_number: string;
  account_name: string;
  account_name_ar: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  account_subtype: string | null;
  parent_account_id: string | null;
  level: number;
  is_group: boolean;
  allow_posting: boolean;
  is_active: boolean;
  normal_balance: 'DEBIT' | 'CREDIT';
  description: string | null;
  balance: number;
}

interface JournalLine {
  line_id: string;
  account_id: string;
  account_number: string;
  account_name_ar: string;
  debit_amount: number;
  credit_amount: number;
  line_description_ar: string | null;
}

interface JournalEntry {
  entry_id: string;
  entry_number: string;
  entry_date: string;
  entry_type: string;
  description_ar: string;
  total_debits: number;
  total_credits: number;
  status: string;
  posted: boolean;
  lines?: JournalLine[];
}

export default function AccountingPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [tab, setTab] = useState<'coa' | 'journal'>('coa');
  const [loading, setLoading] = useState(true);
  const [viewJE, setViewJE] = useState<JournalEntry | null>(null);
  const [loadingJE, setLoadingJE] = useState(false);

  // GL backfill state
  const [backfilling, setBackfilling]     = useState(false);
  const [backfillResult, setBackfillResult] = useState<{
    posted?: number; errors?: string[]; message?: string; steps?: any[];
  } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [accsRes, jeRes] = await Promise.all([
          fetch('/api/finance/accounts'),
          fetch('/api/finance/journals'),
        ]);
        if (accsRes.ok) {
          const d = await accsRes.json();
          setAccounts(d.data || []);
        }
        if (jeRes.ok) {
          const d = await jeRes.json();
          setJournals(d.data || []);
        }
      } catch (e) {
        console.error('Failed to load accounting data', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function reload() {
    setLoading(true);
    try {
      const [accsRes, jeRes] = await Promise.all([
        fetch('/api/finance/accounts'),
        fetch('/api/finance/journals'),
      ]);
      if (accsRes.ok) setAccounts((await accsRes.json()).data || []);
      if (jeRes.ok)   setJournals((await jeRes.json()).data  || []);
    } finally {
      setLoading(false);
    }
  }

  async function runGLTest() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch('/api/finance/gl-test');
      const data = await res.json();
      setBackfillResult({ steps: data.steps, message: `GL Test: ${data.overall}` });
    } catch (e: any) {
      setBackfillResult({ errors: [e.message] });
    } finally {
      setBackfilling(false);
    }
  }

  async function runBackfill() {
    setBackfilling(true);
    setBackfillResult(null);
    try {
      const res = await fetch('/api/finance/gl-backfill', { method: 'POST' });
      const data = await res.json();
      setBackfillResult(data);
      if (data.posted > 0) await reload();
    } catch (e: any) {
      setBackfillResult({ errors: [e.message] });
    } finally {
      setBackfilling(false);
    }
  }

  async function openJournalEntry(je: JournalEntry) {
    setViewJE(je);
    if (!je.lines) {
      setLoadingJE(true);
      try {
        const res = await fetch(`/api/finance/journals/${je.entry_id}`);
        if (res.ok) {
          const d = await res.json();
          setViewJE(d.data);
        }
      } finally {
        setLoadingJE(false);
      }
    }
  }

  const accountsByType = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    accounts.forEach(a => {
      if (!groups[a.account_type]) groups[a.account_type] = [];
      groups[a.account_type].push(a);
    });
    return groups;
  }, [accounts]);

  const typeLabel: Record<string, string> = {
    ASSET: 'Assets', LIABILITY: 'Liabilities', EQUITY: 'Equity',
    REVENUE: 'Revenue', EXPENSE: 'Expenses',
  };
  const typeColor: Record<string, string> = {
    ASSET: 'border-blue-200 bg-blue-50',
    LIABILITY: 'border-red-200 bg-red-50',
    EQUITY: 'border-purple-200 bg-purple-50',
    REVENUE: 'border-emerald-200 bg-emerald-50',
    EXPENSE: 'border-amber-200 bg-amber-50',
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
        {[1, 2, 3].map(i => <div key={i} className="animate-pulse h-20 bg-gray-100 rounded-lg" />)}
      </div>
    );
  }

  const postedJournals = journals.filter(j => j.posted).length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-gray-500 text-sm">Chart of Accounts &amp; Journal Entries</p>
      </div>

      {/* GL backfill panel */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">GL Auto-Posting</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Post journal entries for all PAID invoices that haven't been recorded yet.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={runGLTest}
              disabled={backfilling}
              className="flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs hover:bg-gray-50 text-gray-700 disabled:opacity-50"
            >
              {backfilling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <AlertCircle className="w-3.5 h-3.5" />}
              Diagnose GL
            </button>
            <button
              onClick={runBackfill}
              disabled={backfilling}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {backfilling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              {backfilling ? 'Posting…' : 'Post Unpaid Invoices to GL'}
            </button>
          </div>
        </div>

        {backfillResult && (
          <div className="mt-3 border-t pt-3">
            {/* Simple result */}
            {backfillResult.message && !backfillResult.steps && (
              <div className={`flex items-start gap-2 text-sm rounded-lg p-3 ${
                (backfillResult.errors?.length ?? 0) > 0
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {(backfillResult.errors?.length ?? 0) > 0
                  ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium">{backfillResult.message}</p>
                  {backfillResult.posted !== undefined && (
                    <p className="text-xs mt-0.5">Posted: {backfillResult.posted} entries</p>
                  )}
                  {(backfillResult.errors?.length ?? 0) > 0 && (
                    <ul className="mt-1 text-xs space-y-0.5">
                      {backfillResult.errors!.map((e, i) => <li key={i}>• {e}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Diagnostic steps */}
            {backfillResult.steps && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600">{backfillResult.message}</p>
                {backfillResult.steps.map((s: any, i: number) => (
                  <div key={i} className={`text-xs rounded p-2 border ${s.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      {s.ok ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-red-600" />}
                      {s.step}
                    </div>
                    {s.error && <p className="text-red-600 mt-1 font-mono">{s.error}</p>}
                    {s.ok && s.result && typeof s.result === 'string' && (
                      <p className="text-gray-600 mt-1">{s.result}</p>
                    )}
                    {s.ok && s.result && typeof s.result === 'object' && !Array.isArray(s.result) && s.step.includes('account') && (
                      <div className="mt-1 text-gray-600 space-y-0.5">
                        {Object.entries(s.result).map(([k, v]: any) => v && (
                          <p key={k}>{k}: {v.accountcode} — {v.accountname}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Accounts', value: accounts.length },
          { label: 'Active Accounts', value: accounts.filter(a => a.is_active).length },
          { label: 'Journal Entries', value: journals.length },
          { label: 'Posted Entries', value: postedJournals },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('coa')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'coa' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Chart of Accounts
        </button>
        <button
          onClick={() => setTab('journal')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'journal' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
        >
          Journal Entries
        </button>
      </div>

      {/* Chart of Accounts */}
      {tab === 'coa' && (
        <div className="space-y-4">
          {['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'].map(type => {
            const accs = (accountsByType[type] || []).sort((a, b) =>
              a.account_number.localeCompare(b.account_number)
            );
            if (accs.length === 0) return null;
            return (
              <div key={type} className={`rounded-lg border-2 ${typeColor[type]} overflow-hidden`}>
                <div className="px-4 py-3 font-semibold text-sm">
                  {typeLabel[type]} ({accs.length})
                </div>
                <div className="bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-y">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Account #</th>
                        <th className="text-left px-4 py-2 font-medium text-gray-600 text-xs">Name</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600 text-xs">Normal</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600 text-xs">Posting</th>
                        <th className="text-center px-4 py-2 font-medium text-gray-600 text-xs">Active</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-600 text-xs">Balance (IQD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {accs.map(a => (
                        <tr key={a.account_id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-mono text-xs">{a.account_number}</td>
                          <td className="px-4 py-2 font-medium">
                            {a.level > 1
                              ? <span style={{ paddingLeft: `${(a.level - 1) * 16}px` }}>{a.account_name}</span>
                              : a.account_name
                            }
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${a.normal_balance === 'DEBIT' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                              {a.normal_balance}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {a.allow_posting
                              ? <span className="text-emerald-500 text-xs">Yes</span>
                              : <span className="text-gray-400 text-xs">No</span>
                            }
                          </td>
                          <td className="px-4 py-2 text-center">
                            {a.is_active
                              ? <span className="text-emerald-500 text-xs">Active</span>
                              : <span className="text-red-400 text-xs">Inactive</span>
                            }
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {(parseFloat(String(a.balance)) || 0) !== 0
                              ? fmt(Math.abs(parseFloat(String(a.balance))))
                              : <span className="text-gray-300">-</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="bg-white border rounded-lg p-12 text-center text-gray-400">
              No accounts found
            </div>
          )}
        </div>
      )}

      {/* Journal Entries */}
      {tab === 'journal' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          {journals.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="font-medium">No journal entries yet</p>
              <p className="text-sm mt-1">Journal entries are created automatically when invoices are paid or claims are settled.</p>
            </div>
          ) : (
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
                  {journals.map(je => (
                    <tr key={je.entry_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{je.entry_number}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {je.entry_date ? new Date(je.entry_date).toLocaleDateString('en-GB') : '-'}
                      </td>
                      <td className="px-4 py-3 max-w-[250px] truncate">{je.description_ar}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                          {je.entry_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {fmt(je.total_debits)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-600">
                        {fmt(je.total_credits)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          je.status === 'POSTED'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {je.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => openJournalEntry(je)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* View Journal Entry Modal */}
      {viewJE && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setViewJE(null)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold">{viewJE.entry_number}</h2>
                <p className="text-xs text-gray-500">
                  {viewJE.entry_date
                    ? new Date(viewJE.entry_date).toLocaleDateString('en-GB')
                    : '-'
                  } &middot; {viewJE.entry_type}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                viewJE.status === 'POSTED'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {viewJE.status}
              </span>
            </div>
            <div className="p-6">
              <p className="text-sm mb-4 text-gray-700">{viewJE.description_ar}</p>
              {loadingJE ? (
                <div className="animate-pulse h-24 bg-gray-100 rounded" />
              ) : (
                <table className="w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-medium text-gray-600">Account</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Debit</th>
                      <th className="text-right px-3 py-2 text-xs font-medium text-gray-600">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(viewJE.lines || []).map(line => (
                      <tr key={line.line_id}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{line.account_name_ar}</div>
                          <div className="text-xs text-gray-400">{line.account_number}</div>
                          {line.line_description_ar && (
                            <div className="text-xs text-gray-500">{line.line_description_ar}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                          {(parseFloat(String(line.debit_amount)) || 0) > 0
                            ? fmt(line.debit_amount)
                            : ''
                          }
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-600">
                          {(parseFloat(String(line.credit_amount)) || 0) > 0
                            ? fmt(line.credit_amount)
                            : ''
                          }
                        </td>
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
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setViewJE(null)} className="px-4 py-2 border rounded-lg text-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
