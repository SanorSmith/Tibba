import Link from 'next/link';
import { Pool } from 'pg';
import {
  CreditCard, CheckCircle2, Clock, AlertCircle, FileText,
  Plus, Receipt, ArrowRight, TrendingUp, Users,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(Math.round(parseFloat(String(n)) || 0));

interface RecentInvoice {
  invoice_number: string;
  invoice_date: string;
  patient_name: string;
  total_amount: string;
  balance_due: string;
  status: string;
}

async function getData() {
  const empty = {
    stats: { total: 0, paid: 0, paidAmount: 0, pending: 0, pendingAmount: 0, partial: 0, partialAmount: 0 },
    aging: { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0, total: 0 },
    recent: [] as RecentInvoice[],
  };
  if (!pool) return empty;
  try {
    const [statsRes, agingRes, recentRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'PAID') AS paid,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'PAID'), 0) AS paid_amount,
          COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
          COALESCE(SUM(balance_due) FILTER (WHERE status = 'PENDING'), 0) AS pending_amount,
          COUNT(*) FILTER (WHERE status IN ('PARTIAL','PARTIALLY_PAID')) AS partial,
          COALESCE(SUM(balance_due) FILTER (WHERE status IN ('PARTIAL','PARTIALLY_PAID')), 0) AS partial_amount
        FROM invoices
      `),
      pool.query(`
        SELECT
          COALESCE(SUM(balance_due) FILTER (WHERE CURRENT_DATE - invoice_date::date <= 0), 0) AS current,
          COALESCE(SUM(balance_due) FILTER (WHERE CURRENT_DATE - invoice_date::date BETWEEN 1 AND 30), 0) AS d30,
          COALESCE(SUM(balance_due) FILTER (WHERE CURRENT_DATE - invoice_date::date BETWEEN 31 AND 60), 0) AS d60,
          COALESCE(SUM(balance_due) FILTER (WHERE CURRENT_DATE - invoice_date::date BETWEEN 61 AND 90), 0) AS d90,
          COALESCE(SUM(balance_due) FILTER (WHERE CURRENT_DATE - invoice_date::date > 90), 0) AS d90p,
          COALESCE(SUM(balance_due), 0) AS total
        FROM invoices
        WHERE status NOT IN ('PAID','CANCELLED') AND COALESCE(balance_due,0) > 0
      `),
      pool.query(`
        SELECT invoice_number, invoice_date, patient_name, total_amount, balance_due, status
        FROM invoices ORDER BY createdat DESC NULLS LAST, invoice_date DESC LIMIT 8
      `),
    ]);
    const s = statsRes.rows[0];
    const a = agingRes.rows[0];
    return {
      stats: {
        total: +s.total || 0,
        paid: +s.paid || 0, paidAmount: +s.paid_amount || 0,
        pending: +s.pending || 0, pendingAmount: +s.pending_amount || 0,
        partial: +s.partial || 0, partialAmount: +s.partial_amount || 0,
      },
      aging: {
        current: +a.current || 0, d30: +a.d30 || 0, d60: +a.d60 || 0,
        d90: +a.d90 || 0, d90p: +a.d90p || 0, total: +a.total || 0,
      },
      recent: recentRes.rows as RecentInvoice[],
    };
  } catch {
    return empty;
  }
}

const statusPill = (status: string) => {
  const map: Record<string, string> = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    PARTIAL: 'bg-blue-100 text-blue-700',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
    UNPAID: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};

export default async function BillingPage() {
  const { stats, aging, recent } = await getData();
  const outstanding = stats.pending + stats.partial;
  const outstandingAmount = stats.pendingAmount + stats.partialAmount;
  const collectionRate = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;

  const kpis = [
    { label: 'Total Invoices', value: stats.total, sub: 'All time', icon: CreditCard, color: 'text-gray-900', iconColor: 'text-gray-400' },
    { label: 'Collected', value: `${fmt(stats.paidAmount)} IQD`, sub: `${stats.paid} paid · ${collectionRate}% rate`, icon: CheckCircle2, color: 'text-emerald-600', iconColor: 'text-emerald-500' },
    { label: 'Outstanding', value: `${fmt(outstandingAmount)} IQD`, sub: `${outstanding} invoices due`, icon: Clock, color: 'text-amber-600', iconColor: 'text-amber-500' },
    { label: 'Overdue 90+ days', value: `${fmt(aging.d90p)} IQD`, sub: 'Needs follow-up', icon: AlertCircle, color: aging.d90p > 0 ? 'text-red-600' : 'text-gray-900', iconColor: 'text-red-400' },
  ];

  const agingBuckets = [
    { label: 'Current', value: aging.current, color: 'bg-emerald-500' },
    { label: '1–30 days', value: aging.d30, color: 'bg-lime-500' },
    { label: '31–60 days', value: aging.d60, color: 'bg-amber-500' },
    { label: '61–90 days', value: aging.d90, color: 'bg-orange-500' },
    { label: '90+ days', value: aging.d90p, color: 'bg-red-500' },
  ];

  const quickLinks = [
    { href: '/finance/invoices', label: 'New Invoice', desc: 'Create a customer invoice', icon: Plus },
    { href: '/reception/invoices', label: 'Reception Billing', desc: 'Front-desk invoicing', icon: Receipt },
    { href: '/finance/reports', label: 'AR Aging & Reports', desc: 'Income, aging, cash flow', icon: TrendingUp },
    { href: '/finance/distributions', label: 'Provider Payouts', desc: 'Stakeholder share payments', icon: Users },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Invoicing</h1>
          <p className="text-gray-500 text-sm">Revenue cycle overview — invoices, collections, and receivables</p>
        </div>
        <Link
          href="/finance/invoices"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{k.label}</span>
                <Icon className={`w-4 h-4 ${k.iconColor}`} />
              </div>
              <div className={`text-xl font-bold mt-2 ${k.color}`}>{k.value}</div>
              <div className="text-xs text-gray-400 mt-1">{k.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent invoices */}
        <div className="lg:col-span-2 bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-sm text-gray-900">Recent Invoices</h2>
            <Link href="/finance/invoices" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">
              <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No invoices yet. Create one to get started.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Invoice #</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Patient</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Date</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Total</th>
                  <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recent.map(inv => (
                  <tr key={inv.invoice_number} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs text-blue-600">{inv.invoice_number}</td>
                    <td className="px-4 py-2 font-medium text-gray-800">{inv.patient_name || '—'}</td>
                    <td className="px-4 py-2 text-gray-500 text-xs">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">{fmt(inv.total_amount)} IQD</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusPill(inv.status)}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* AR aging snapshot */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-900">Receivables Aging</h2>
            <Link href="/finance/reports" className="text-xs text-blue-600 hover:underline">Details</Link>
          </div>
          {aging.total === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">Nothing outstanding ✓</p>
          ) : (
            <div className="space-y-3">
              {agingBuckets.map(b => {
                const pct = aging.total > 0 ? (b.value / aging.total) * 100 : 0;
                return (
                  <div key={b.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600">{b.label}</span>
                      <span className="font-medium text-gray-900">{fmt(b.value)} IQD</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${b.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between text-sm font-bold border-t pt-3 mt-2">
                <span>Total Outstanding</span>
                <span>{fmt(aging.total)} IQD</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold text-sm text-gray-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map(q => {
            const Icon = q.icon;
            return (
              <Link key={q.href} href={q.href}
                className="bg-white rounded-lg border p-4 hover:border-blue-300 hover:shadow-sm transition group">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100">
                    <Icon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{q.label}</div>
                    <div className="text-xs text-gray-400 truncate">{q.desc}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
