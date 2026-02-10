'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, Users, ShoppingCart,
  Warehouse, AlertTriangle, ArrowRight, FileText, Handshake, RotateCcw,
  Shield, Truck, BookOpen, BarChart3, Plus, Clock,
} from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { MedicalInvoice, PurchaseOrder, Stock } from '@/types/finance';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function FinancePage() {
  const [invoices, setInvoices] = useState<MedicalInvoice[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    financeStore.initialize();
    setInvoices(financeStore.getInvoices());
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    if (!mounted) return null;
    const inv = invoices;
    const totalRevenue = inv.reduce((s, i) => s + i.total_amount, 0);
    const totalPaid = inv.reduce((s, i) => s + i.amount_paid, 0);
    const totalDue = inv.reduce((s, i) => s + i.balance_due, 0);
    const insuranceDue = inv.reduce((s, i) => s + i.insurance_coverage_amount, 0);
    const paidCount = inv.filter(i => i.status === 'PAID').length;
    const pendingCount = inv.filter(i => ['PENDING', 'UNPAID', 'PARTIALLY_PAID'].includes(i.status)).length;

    const pos = financeStore.getPurchaseOrders();
    const totalPurchases = pos.reduce((s, po) => s + po.total_amount, 0);
    const poUnpaid = pos.reduce((s, po) => s + po.balance_due, 0);

    const shares = financeStore.getInvoiceShares();
    const pendingShares = shares.filter(s => s.payment_status === 'PENDING').reduce((sum, s) => sum + s.share_amount, 0);

    const stock = financeStore.getStock();
    const lowStockCount = stock.filter(s => s.stock_status === 'LOW_STOCK' || s.stock_status === 'OUT_OF_STOCK').length;
    const totalStockValue = stock.reduce((s, st) => s + st.total_value, 0);

    const returns = financeStore.getReturns();
    const totalReturns = returns.reduce((s, r) => s + r.total_return_amount, 0);

    const patients = financeStore.getPatients();
    const suppliers = financeStore.getSuppliers();
    const prs = financeStore.getPurchaseRequests();
    const pendingPRs = prs.filter(p => ['SUBMITTED', 'PENDING_APPROVAL'].includes(p.status)).length;

    return {
      totalRevenue, totalPaid, totalDue, insuranceDue, paidCount, pendingCount,
      totalPurchases, poUnpaid, pendingShares, lowStockCount, totalStockValue,
      totalReturns, patientCount: patients.length, supplierCount: suppliers.length,
      pendingPRs, invoiceCount: inv.length,
    };
  }, [invoices, mounted]);

  if (!mounted || !stats) {
    return <div className="p-6"><div className="animate-pulse h-8 w-64 bg-gray-200 rounded mb-4" /><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-28 bg-gray-100 rounded-lg" />)}</div></div>;
  }

  const recentInvoices = [...invoices].sort((a, b) => b.invoice_date.localeCompare(a.invoice_date)).slice(0, 5);

  const kpis = [
    { label: 'Total Revenue', value: `${fmt(stats.totalRevenue)} IQD`, icon: TrendingUp, iconColor: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Amount Collected', value: `${fmt(stats.totalPaid)} IQD`, icon: DollarSign, iconColor: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Outstanding Balance', value: `${fmt(stats.totalDue)} IQD`, icon: Clock, iconColor: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Insurance Receivable', value: `${fmt(stats.insuranceDue)} IQD`, icon: Shield, iconColor: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending Shares', value: `${fmt(stats.pendingShares)} IQD`, icon: Handshake, iconColor: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Total Purchases', value: `${fmt(stats.totalPurchases)} IQD`, icon: ShoppingCart, iconColor: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Stock Value', value: `${fmt(stats.totalStockValue)} IQD`, icon: Warehouse, iconColor: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Low Stock Items', value: `${stats.lowStockCount} items`, icon: AlertTriangle, iconColor: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const quickActions = [
    { label: 'New Invoice', href: '/finance/invoices/new', icon: Plus, color: 'bg-blue-400 hover:bg-blue-500' },
    { label: 'New Patient', href: '/finance/patients', icon: Users, color: 'bg-blue-400 hover:bg-blue-500' },
    { label: 'Purchase Request', href: '/finance/purchases', icon: ShoppingCart, color: 'bg-blue-400 hover:bg-blue-500' },
    { label: 'View Reports', href: '/finance/reports', icon: BarChart3, color: 'bg-blue-400 hover:bg-blue-500' },
  ];

  const navCards = [
    { label: 'Patients', desc: `${stats.patientCount} registered`, href: '/finance/patients', icon: Users, color: 'border-blue-200' },
    { label: 'Insurance', desc: '5 providers', href: '/finance/insurance', icon: Shield, color: 'border-purple-200' },
    { label: 'Stakeholders', desc: 'Revenue sharing', href: '/finance/stakeholders', icon: Handshake, color: 'border-orange-200' },
    { label: 'Invoices', desc: `${stats.invoiceCount} invoices`, href: '/finance/invoices', icon: Receipt, color: 'border-emerald-200' },
    { label: 'Returns', desc: `${fmt(stats.totalReturns)} IQD`, href: '/finance/returns', icon: RotateCcw, color: 'border-red-200' },
    { label: 'Purchases', desc: `${stats.pendingPRs} pending PRs`, href: '/finance/purchases', icon: ShoppingCart, color: 'border-amber-200' },
    { label: 'Inventory', desc: `${stats.lowStockCount} low stock`, href: '/finance/inventory', icon: Warehouse, color: 'border-teal-200' },
    { label: 'Suppliers', desc: `${stats.supplierCount} suppliers`, href: '/finance/suppliers', icon: Truck, color: 'border-gray-200' },
    { label: 'Accounting', desc: 'Chart of Accounts', href: '/finance/accounting', icon: BookOpen, color: 'border-indigo-200' },
    { label: 'Reports', desc: 'Financial statements', href: '/finance/reports', icon: BarChart3, color: 'border-pink-200' },
  ];

  const statusColor = (s: string) => {
    switch (s) {
      case 'PAID': return 'bg-emerald-100 text-emerald-700';
      case 'PARTIALLY_PAID': return 'bg-amber-100 text-amber-700';
      case 'PENDING': return 'bg-blue-100 text-blue-700';
      case 'UNPAID': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Finance Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Hospital Financial Management System - Iraqi Dinar (IQD)</p>
        </div>
        <div className="flex gap-2">
          {quickActions.map(a => (
            <Link key={a.href} href={a.href} className={`${a.color} text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 hover:opacity-90 transition`}>
              <a.icon size={14} /> <span className="hidden sm:inline">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${k.bg} p-1.5 rounded`}><k.icon size={14} className={k.iconColor} /></div>
              <span className="text-xs text-gray-500 font-medium">{k.label}</span>
            </div>
            <div className="text-sm lg:text-base font-bold text-gray-900">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-2 bg-white rounded-lg border">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-gray-900">Recent Invoices</h2>
            <Link href="/finance/invoices" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
              View All <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y">
            {recentInvoices.map(inv => (
              <div key={inv.invoice_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{inv.invoice_number}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>{inv.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{inv.patient_name_ar} - {inv.invoice_date}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{fmt(inv.total_amount)} IQD</div>
                  {inv.balance_due > 0 && <p className="text-[10px] text-red-500">Due: {fmt(inv.balance_due)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          {/* Invoice Summary */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Invoice Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Paid</span><span className="font-medium text-gray-900">{stats.paidCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Pending/Unpaid</span><span className="font-medium text-gray-600">{stats.pendingCount}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Total</span><span className="font-bold">{stats.invoiceCount}</span></div>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Alerts</h3>
            <div className="space-y-2">
              {stats.lowStockCount > 0 && (
                <Link href="/finance/inventory" className="flex items-center gap-2 text-xs p-2 bg-rose-50 rounded text-rose-700 hover:bg-rose-100 transition">
                  <AlertTriangle size={14} /> {stats.lowStockCount} items low on stock
                </Link>
              )}
              {stats.pendingPRs > 0 && (
                <Link href="/finance/purchases" className="flex items-center gap-2 text-xs p-2 bg-amber-50 rounded text-amber-700 hover:bg-amber-100 transition">
                  <Clock size={14} /> {stats.pendingPRs} purchase requests pending
                </Link>
              )}
              {stats.totalDue > 0 && (
                <Link href="/finance/invoices" className="flex items-center gap-2 text-xs p-2 bg-blue-50 rounded text-blue-700 hover:bg-blue-100 transition">
                  <DollarSign size={14} /> {fmt(stats.totalDue)} IQD outstanding
                </Link>
              )}
              {stats.pendingShares > 0 && (
                <Link href="/finance/stakeholders" className="flex items-center gap-2 text-xs p-2 bg-orange-50 rounded text-orange-700 hover:bg-orange-100 transition">
                  <Handshake size={14} /> {fmt(stats.pendingShares)} IQD shares pending
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Finance Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {navCards.map(c => (
            <Link key={c.href} href={c.href} className={`bg-white rounded-lg border-2 ${c.color} p-4 hover:shadow-md transition group`}>
              <c.icon size={20} className="text-gray-400 group-hover:text-gray-600 mb-2" />
              <div className="font-medium text-sm text-gray-900">{c.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
