'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, Users, ShoppingCart,
  Warehouse, AlertTriangle, ArrowRight, FileText, Handshake, RotateCcw,
  Shield, Truck, BookOpen, BarChart3, Plus, Clock, PieChart, AlertCircle, CheckCircle,
} from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { MedicalInvoice, PurchaseOrder, Stock } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

interface BudgetPeriod {
  id: string;
  period_name: string;
  fiscal_year: number;
  total_revenue_budget: number;
  total_expense_budget: number;
  total_capital_budget: number;
  total_operational_budget: number;
  total_revenue_actual: number;
  total_expense_actual: number;
  total_capital_actual: number;
  total_operational_actual: number;
  status: string;
}

export default function FinancePage() {
  const [invoices, setInvoices] = useState<MedicalInvoice[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeBudget, setActiveBudget] = useState<BudgetPeriod | null>(null);

  useEffect(() => {
    financeStore.initialize();
    setInvoices(financeStore.getInvoices());
    loadActiveBudget();
    setMounted(true);
  }, []);

  const loadActiveBudget = async () => {
    try {
      const res = await fetch('/api/budget?type=periods&status=ACTIVE');
      if (res.ok) {
        const periods = await res.json();
        if (periods.length > 0) {
          setActiveBudget(periods[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load budget:', error);
    }
  };

  const budgetStats = useMemo(() => {
    if (!activeBudget) return null;
    
    // Revenue calculations (achievement-based)
    const revenueUtilization = activeBudget.total_revenue_budget > 0 
      ? (activeBudget.total_revenue_actual / activeBudget.total_revenue_budget) * 100 : 0;
    const revenueVariance = activeBudget.total_revenue_budget - activeBudget.total_revenue_actual;
    
    // Expense calculations (spending-based)
    const expenseUtilization = activeBudget.total_expense_budget > 0 
      ? (activeBudget.total_expense_actual / activeBudget.total_expense_budget) * 100 : 0;
    const expenseVariance = activeBudget.total_expense_budget - activeBudget.total_expense_actual;
    
    // Operational calculations (matches Budget page)
    const operationalUtilization = activeBudget.total_operational_budget > 0 
      ? (activeBudget.total_operational_actual / activeBudget.total_operational_budget) * 100 : 0;
    const operationalVariance = activeBudget.total_operational_budget - activeBudget.total_operational_actual;
    
    // Capital calculations (matches Budget page)
    const capitalUtilization = activeBudget.total_capital_budget > 0 
      ? (activeBudget.total_capital_actual / activeBudget.total_capital_budget) * 100 : 0;
    const capitalVariance = activeBudget.total_capital_budget - activeBudget.total_capital_actual;

    // Total budget calculations (matches Budget page totals)
    const totalBudget = activeBudget.total_revenue_budget + activeBudget.total_expense_budget + activeBudget.total_capital_budget;
    const totalActual = activeBudget.total_revenue_actual + activeBudget.total_expense_actual + activeBudget.total_capital_actual;
    const overallUtilization = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;
    const totalVariance = totalBudget - totalActual;

    return {
      revenueUtilization,
      revenueVariance,
      expenseUtilization,
      expenseVariance,
      operationalUtilization,
      operationalVariance,
      capitalUtilization,
      capitalVariance,
      totalBudget,
      totalActual,
      totalVariance,
      overallUtilization,
    };
  }, [activeBudget]);

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

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 50) return 'text-green-600';
    if (utilization < 80) return 'text-blue-600';
    if (utilization < 95) return 'text-orange-600';
    return 'text-red-600';
  };

  const getUtilizationBg = (utilization: number) => {
    if (utilization < 50) return 'bg-green-500';
    if (utilization < 80) return 'bg-blue-500';
    if (utilization < 95) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const navCards = [
    { label: 'Patients', desc: `${stats.patientCount} registered`, href: '/finance/patients', icon: Users, color: 'border-blue-200' },
    { label: 'Insurance', desc: '5 providers', href: '/finance/insurance', icon: Shield, color: 'border-purple-200' },
    { label: 'Stakeholders', desc: 'Revenue sharing', href: '/finance/stakeholders', icon: Handshake, color: 'border-orange-200' },
    { label: 'Invoices', desc: `${stats.invoiceCount} invoices`, href: '/finance/invoices', icon: Receipt, color: 'border-emerald-200' },
    { label: 'Returns', desc: `${fmt(stats.totalReturns)} IQD`, href: '/finance/returns', icon: RotateCcw, color: 'border-red-200' },
    { label: 'Purchases', desc: `${stats.pendingPRs} pending PRs`, href: '/finance/purchases', icon: ShoppingCart, color: 'border-amber-200' },
    { label: 'Inventory', desc: `${stats.lowStockCount} low stock`, href: '/finance/inventory', icon: Warehouse, color: 'border-teal-200' },
    { label: 'Suppliers', desc: `${stats.supplierCount} suppliers`, href: '/finance/suppliers', icon: Truck, color: 'border-gray-200' },
    { label: 'Budget', desc: 'Budget management', href: '/finance/budget', icon: PieChart, color: 'border-purple-200' },
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

      {/* Budget Overview - Prominent Section */}
      {activeBudget && budgetStats && (
        <div className="bg-white rounded-xl p-6 shadow-lg border-4 border-gradient-to-r from-purple-600 via-purple-700 to-indigo-700">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <PieChart className="w-8 h-8 text-purple-600" />
                <h2 className="text-2xl font-bold text-gray-900">Hospital Budget Overview</h2>
              </div>
              <p className="text-gray-600 text-sm">{activeBudget.period_name} • Fiscal Year {activeBudget.fiscal_year}</p>
            </div>
            <Link href="/finance/budget" className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition">
              View Details <ArrowRight size={16} />
            </Link>
          </div>

          {/* Budget Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Revenue Budget */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 font-medium">Revenue Budget</span>
                {budgetStats.revenueUtilization >= 80 ? 
                  <CheckCircle className="w-4 h-4 text-green-600" /> : 
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                }
              </div>
              <div className="text-2xl font-bold mb-1 text-gray-900">{fmt(activeBudget.total_revenue_budget)} IQD</div>
              <div className="text-sm text-gray-600 mb-1">Actual: {fmt(activeBudget.total_revenue_actual)} IQD</div>
              <div className="text-xs text-gray-500 mb-2">Variance: {fmt(budgetStats.revenueVariance)} IQD</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(budgetStats.revenueUtilization, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-900">{pct(budgetStats.revenueUtilization)}</span>
              </div>
            </div>

            {/* Operational Budget */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 font-medium">Operational Budget</span>
                {budgetStats.operationalUtilization < 95 ? 
                  <CheckCircle className="w-4 h-4 text-green-600" /> : 
                  <AlertCircle className="w-4 h-4 text-red-600" />
                }
              </div>
              <div className="text-2xl font-bold mb-1 text-gray-900">{fmt(activeBudget.total_operational_budget)} IQD</div>
              <div className="text-sm text-gray-600 mb-1">Spent: {fmt(activeBudget.total_operational_actual)} IQD</div>
              <div className="text-xs text-gray-500 mb-2">Remaining: {fmt(budgetStats.operationalVariance)} IQD</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getUtilizationBg(budgetStats.operationalUtilization)}`}
                    style={{ width: `${Math.min(budgetStats.operationalUtilization, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-900">{pct(budgetStats.operationalUtilization)}</span>
              </div>
            </div>

            {/* Capital Budget */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 font-medium">Capital Budget</span>
                {budgetStats.capitalUtilization < 95 ? 
                  <CheckCircle className="w-4 h-4 text-green-600" /> : 
                  <AlertCircle className="w-4 h-4 text-red-600" />
                }
              </div>
              <div className="text-2xl font-bold mb-1 text-gray-900">{fmt(activeBudget.total_capital_budget)} IQD</div>
              <div className="text-sm text-gray-600 mb-1">Spent: {fmt(activeBudget.total_capital_actual)} IQD</div>
              <div className="text-xs text-gray-500 mb-2">Remaining: {fmt(budgetStats.capitalVariance)} IQD</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getUtilizationBg(budgetStats.capitalUtilization)}`}
                    style={{ width: `${Math.min(budgetStats.capitalUtilization, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-900">{pct(budgetStats.capitalUtilization)}</span>
              </div>
            </div>

            {/* Total Budget Summary */}
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-600 font-medium">Total Budget</span>
                {budgetStats.overallUtilization < 90 ? 
                  <CheckCircle className="w-4 h-4 text-green-600" /> : 
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                }
              </div>
              <div className="text-2xl font-bold mb-1 text-gray-900">{fmt(budgetStats.totalBudget)} IQD</div>
              <div className="text-sm text-gray-600 mb-1">Used: {fmt(budgetStats.totalActual)} IQD</div>
              <div className="text-xs text-gray-500 mb-2">Available: {fmt(budgetStats.totalVariance)} IQD</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getUtilizationBg(budgetStats.overallUtilization)}`}
                    style={{ width: `${Math.min(budgetStats.overallUtilization, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-900">{pct(budgetStats.overallUtilization)}</span>
              </div>
            </div>
          </div>

          {/* Budget Alerts */}
          <div className="mt-4 flex flex-wrap gap-2">
            {budgetStats.operationalUtilization > 90 && (
              <div className="bg-red-50 border border-red-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-red-600" /> Operational budget at {pct(budgetStats.operationalUtilization)} - Critical
              </div>
            )}
            {budgetStats.capitalUtilization > 90 && (
              <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-orange-600" /> Capital budget at {pct(budgetStats.capitalUtilization)} - Warning
              </div>
            )}
            {budgetStats.revenueUtilization < 50 && (
              <div className="bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <AlertCircle size={12} className="text-yellow-600" /> Revenue achievement at {pct(budgetStats.revenueUtilization)} - Below target
              </div>
            )}
            {budgetStats.overallUtilization < 90 && budgetStats.operationalUtilization < 90 && budgetStats.capitalUtilization < 90 && (
              <div className="bg-green-50 border border-green-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5">
                <CheckCircle size={12} className="text-green-600" /> Budget utilization healthy - All categories within limits
              </div>
            )}
          </div>
        </div>
      )}

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
