'use client';

import { useEffect, useState, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Calendar, PieChart, BarChart3, AlertTriangle, CheckCircle, Clock, Eye, Plus, Filter } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);
const pct = (n: number) => `${n.toFixed(1)}%`;

interface BudgetPeriod {
  id: string;
  period_code: string;
  period_name: string;
  period_name_ar: string;
  fiscal_year: number;
  start_date: string;
  end_date: string;
  period_type: string;
  status: string;
  total_revenue_budget: number;
  total_expense_budget: number;
  total_capital_budget: number;
  total_operational_budget: number;
  total_revenue_actual: number;
  total_expense_actual: number;
  total_capital_actual: number;
  total_operational_actual: number;
}

interface BudgetAllocation {
  id: string;
  allocation_code: string;
  department: string;
  department_ar: string;
  cost_center: string;
  allocated_amount: number;
  committed_amount: number;
  actual_amount: number;
  available_amount: number;
  variance_amount: number;
  variance_percentage: number;
  status: string;
  category: {
    category_name: string;
    category_name_ar: string;
    category_type: string;
  };
  period: {
    period_name: string;
    fiscal_year: number;
  };
}

interface BudgetCategory {
  id: string;
  category_code: string;
  category_name: string;
  category_name_ar: string;
  category_type: string;
}

export default function BudgetPage() {
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<BudgetPeriod | null>(null);
  const [mounted, setMounted] = useState(false);
  const [viewAllocation, setViewAllocation] = useState<BudgetAllocation | null>(null);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCategoryType, setFilterCategoryType] = useState('');

  useEffect(() => {
    loadBudgetData();
    setMounted(true);
  }, []);

  const loadBudgetData = async () => {
    try {
      const [periodsRes, categoriesRes] = await Promise.all([
        fetch('/api/budget?type=periods'),
        fetch('/api/budget?type=categories'),
      ]);

      if (periodsRes.ok) {
        const periodsData = await periodsRes.json();
        setPeriods(periodsData);
        const activePeriod = periodsData.find((p: BudgetPeriod) => p.status === 'ACTIVE');
        if (activePeriod) {
          setSelectedPeriod(activePeriod);
          loadAllocations(activePeriod.id);
        }
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Failed to load budget data');
    }
  };

  const loadAllocations = async (periodId: string) => {
    try {
      const res = await fetch(`/api/budget?type=allocations&period_id=${periodId}`);
      if (res.ok) {
        const data = await res.json();
        setAllocations(data);
      }
    } catch (error) {
      console.error('Load allocations error:', error);
    }
  };

  const handlePeriodChange = (periodId: string) => {
    const period = periods.find(p => p.id === periodId);
    if (period) {
      setSelectedPeriod(period);
      loadAllocations(period.id);
    }
  };

  const stats = useMemo(() => {
    if (!selectedPeriod) return null;

    const totalBudget = selectedPeriod.total_revenue_budget + selectedPeriod.total_expense_budget + selectedPeriod.total_capital_budget;
    const totalActual = selectedPeriod.total_revenue_actual + selectedPeriod.total_expense_actual + selectedPeriod.total_capital_actual;
    const totalCommitted = allocations.reduce((sum, a) => sum + a.committed_amount, 0);
    const totalAvailable = allocations.reduce((sum, a) => sum + a.available_amount, 0);

    const revenueVariance = selectedPeriod.total_revenue_budget - selectedPeriod.total_revenue_actual;
    const expenseVariance = selectedPeriod.total_expense_budget - selectedPeriod.total_expense_actual;
    const capitalVariance = selectedPeriod.total_capital_budget - selectedPeriod.total_capital_actual;

    const revenueUtilization = selectedPeriod.total_revenue_budget > 0 
      ? (selectedPeriod.total_revenue_actual / selectedPeriod.total_revenue_budget) * 100 
      : 0;
    const expenseUtilization = selectedPeriod.total_expense_budget > 0 
      ? (selectedPeriod.total_expense_actual / selectedPeriod.total_expense_budget) * 100 
      : 0;
    const capitalUtilization = selectedPeriod.total_capital_budget > 0 
      ? (selectedPeriod.total_capital_actual / selectedPeriod.total_capital_budget) * 100 
      : 0;

    return {
      totalBudget,
      totalActual,
      totalCommitted,
      totalAvailable,
      revenueVariance,
      expenseVariance,
      capitalVariance,
      revenueUtilization,
      expenseUtilization,
      capitalUtilization,
    };
  }, [selectedPeriod, allocations]);

  const filteredAllocations = allocations.filter(a => {
    const matchesDept = !filterDepartment || a.department === filterDepartment;
    const matchesType = !filterCategoryType || a.category.category_type === filterCategoryType;
    return matchesDept && matchesType;
  });

  const departments = useMemo(() => {
    return Array.from(new Set(allocations.map(a => a.department))).filter(Boolean);
  }, [allocations]);

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'APPROVED': return 'bg-blue-100 text-blue-700';
      case 'DRAFT': return 'bg-gray-100 text-gray-600';
      case 'CLOSED': return 'bg-red-100 text-red-700';
      case 'FROZEN': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const categoryTypeColor = (type: string) => {
    switch (type) {
      case 'REVENUE': return 'bg-emerald-100 text-emerald-700';
      case 'EXPENSE': return 'bg-red-100 text-red-700';
      case 'OPERATIONAL': return 'bg-blue-100 text-blue-700';
      case 'CAPITAL': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getVarianceColor = (variance: number, isRevenue: boolean = false) => {
    if (isRevenue) {
      return variance < 0 ? 'text-green-600' : 'text-red-600';
    }
    return variance > 0 ? 'text-green-600' : 'text-red-600';
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization < 50) return 'text-green-600';
    if (utilization < 80) return 'text-blue-600';
    if (utilization < 95) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hospital Budget Management</h1>
          <p className="text-gray-500 text-sm">Budget planning, allocation, and monitoring</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod?.id || ''}
            onChange={(e) => handlePeriodChange(e.target.value)}
            className="px-4 py-2 border rounded-lg text-sm font-medium"
          >
            <option value="">Select Period</option>
            {periods.map(period => (
              <option key={period.id} value={period.id}>
                {period.period_name} ({period.fiscal_year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPeriod && stats && (
        <>
          {/* Period Overview */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedPeriod.period_name}</h2>
                <p className="text-blue-100 text-sm">
                  {selectedPeriod.start_date} to {selectedPeriod.end_date} • Fiscal Year {selectedPeriod.fiscal_year}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor(selectedPeriod.status)} bg-white`}>
                {selectedPeriod.status}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-blue-100 text-xs mb-1">Total Budget</div>
                <div className="text-2xl font-bold">{fmt(stats.totalBudget)} IQD</div>
              </div>
              <div>
                <div className="text-blue-100 text-xs mb-1">Total Actual</div>
                <div className="text-2xl font-bold">{fmt(stats.totalActual)} IQD</div>
              </div>
              <div>
                <div className="text-blue-100 text-xs mb-1">Committed</div>
                <div className="text-2xl font-bold">{fmt(stats.totalCommitted)} IQD</div>
              </div>
              <div>
                <div className="text-blue-100 text-xs mb-1">Available</div>
                <div className="text-2xl font-bold">{fmt(stats.totalAvailable)} IQD</div>
              </div>
            </div>
          </div>

          {/* Budget Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Revenue */}
            <div className="bg-white rounded-xl p-6 border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Revenue Budget</div>
                    <div className="font-bold text-gray-900">{fmt(selectedPeriod.total_revenue_budget)} IQD</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Actual:</span>
                  <span className="font-medium">{fmt(selectedPeriod.total_revenue_actual)} IQD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Variance:</span>
                  <span className={`font-medium ${getVarianceColor(stats.revenueVariance, true)}`}>
                    {fmt(Math.abs(stats.revenueVariance))} IQD
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Achievement:</span>
                  <span className={`font-bold ${getUtilizationColor(stats.revenueUtilization)}`}>
                    {pct(stats.revenueUtilization)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(stats.revenueUtilization, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Operational Expenses */}
            <div className="bg-white rounded-xl p-6 border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Operational Budget</div>
                    <div className="font-bold text-gray-900">{fmt(selectedPeriod.total_operational_budget)} IQD</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Actual:</span>
                  <span className="font-medium">{fmt(selectedPeriod.total_operational_actual)} IQD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Variance:</span>
                  <span className={`font-medium ${getVarianceColor(stats.expenseVariance)}`}>
                    {fmt(Math.abs(stats.expenseVariance))} IQD
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Utilization:</span>
                  <span className={`font-bold ${getUtilizationColor(stats.expenseUtilization)}`}>
                    {pct(stats.expenseUtilization)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(stats.expenseUtilization, 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Capital Expenses */}
            <div className="bg-white rounded-xl p-6 border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <PieChart className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Capital Budget</div>
                    <div className="font-bold text-gray-900">{fmt(selectedPeriod.total_capital_budget)} IQD</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Actual:</span>
                  <span className="font-medium">{fmt(selectedPeriod.total_capital_actual)} IQD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Variance:</span>
                  <span className={`font-medium ${getVarianceColor(stats.capitalVariance)}`}>
                    {fmt(Math.abs(stats.capitalVariance))} IQD
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Utilization:</span>
                  <span className={`font-bold ${getUtilizationColor(stats.capitalUtilization)}`}>
                    {pct(stats.capitalUtilization)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(stats.capitalUtilization, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter Allocations</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <select
                value={filterCategoryType}
                onChange={(e) => setFilterCategoryType(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Category Types</option>
                <option value="REVENUE">Revenue</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="CAPITAL">Capital</option>
                <option value="EXPENSE">Expense</option>
              </select>
            </div>
          </div>

          {/* Budget Allocations Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Budget Allocations</h3>
              <p className="text-sm text-gray-500">Department-wise budget allocation and utilization</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Type</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Allocated</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Committed</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actual</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Available</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Utilization</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAllocations.map(allocation => {
                    const utilization = allocation.allocated_amount > 0 
                      ? (allocation.actual_amount / allocation.allocated_amount) * 100 
                      : 0;
                    
                    return (
                      <tr key={allocation.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{allocation.allocation_code}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{allocation.department}</div>
                          <div className="text-xs text-gray-500">{allocation.department_ar}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{allocation.category.category_name}</div>
                          <div className="text-xs text-gray-500">{allocation.category.category_name_ar}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryTypeColor(allocation.category.category_type)}`}>
                            {allocation.category.category_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{fmt(allocation.allocated_amount)}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{fmt(allocation.committed_amount)}</td>
                        <td className="px-4 py-3 text-right text-blue-600">{fmt(allocation.actual_amount)}</td>
                        <td className="px-4 py-3 text-right font-medium text-green-600">{fmt(allocation.available_amount)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className={`font-bold ${getUtilizationColor(utilization)}`}>
                            {pct(utilization)}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${utilization > 95 ? 'bg-red-500' : utilization > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(allocation.status)}`}>
                            {allocation.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button 
                            onClick={() => setViewAllocation(allocation)} 
                            className="p-1.5 hover:bg-gray-100 rounded"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAllocations.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                        No budget allocations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!selectedPeriod && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Budget Period Selected</h3>
          <p className="text-gray-500">Please select a budget period from the dropdown above</p>
        </div>
      )}

      {/* View Allocation Modal */}
      {viewAllocation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewAllocation(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold title-dark">{viewAllocation.allocation_code}</h2>
                  <p className="text-sm text-gray-500">{viewAllocation.department} • {viewAllocation.department_ar}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(viewAllocation.status)}`}>
                  {viewAllocation.status}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">Category Information</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <div className="font-medium">{viewAllocation.category.category_name}</div>
                    <div className="text-xs text-gray-500">{viewAllocation.category.category_name_ar}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryTypeColor(viewAllocation.category.category_type)}`}>
                        {viewAllocation.category.category_type}
                      </span>
                    </div>
                  </div>
                  {viewAllocation.cost_center && (
                    <div>
                      <span className="text-gray-600">Cost Center:</span>
                      <div className="font-medium">{viewAllocation.cost_center}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">Budget Summary</div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Allocated Amount:</span>
                    <span className="text-lg font-bold title-dark text-gray-900">{fmt(viewAllocation.allocated_amount)} IQD</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm text-gray-600">Committed:</span>
                    <span className="font-medium text-orange-600">{fmt(viewAllocation.committed_amount)} IQD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Actual Spent:</span>
                    <span className="font-medium text-blue-600">{fmt(viewAllocation.actual_amount)} IQD</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm text-gray-600">Available:</span>
                    <span className="text-lg font-bold title-dark text-green-600">{fmt(viewAllocation.available_amount)} IQD</span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm text-gray-600">Variance:</span>
                    <span className={`font-bold ${getVarianceColor(viewAllocation.variance_amount)}`}>
                      {fmt(Math.abs(viewAllocation.variance_amount))} IQD ({pct(Math.abs(viewAllocation.variance_percentage))})
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm font-medium text-gray-700 mb-3">Utilization</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Budget Utilization:</span>
                    <span className={`font-bold ${getUtilizationColor((viewAllocation.actual_amount / viewAllocation.allocated_amount) * 100)}`}>
                      {pct((viewAllocation.actual_amount / viewAllocation.allocated_amount) * 100)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        (viewAllocation.actual_amount / viewAllocation.allocated_amount) * 100 > 95 ? 'bg-red-500' :
                        (viewAllocation.actual_amount / viewAllocation.allocated_amount) * 100 > 80 ? 'bg-orange-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min((viewAllocation.actual_amount / viewAllocation.allocated_amount) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button onClick={() => setViewAllocation(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
