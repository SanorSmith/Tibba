'use client';

// COMPLETELY NEW FILE - BYPASS CACHE
import { useState, useEffect } from 'react';
import { Download, DollarSign, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

// Label mapping function (same as API)
const getCategoryLabel = (category: string): string => {
  const categoryLabels: { [key: string]: string } = {
    'PAID_INVOICES': 'Paid Invoices',
    'INSURANCE_PAYMENTS': 'Insurance Payments',
    'PATIENT_PAYMENTS': 'Patient Payments',
    'SALARIES_WAGES': 'Salaries & Wages',
    'SURGERY': 'Surgical Services',
    'RADIOLOGY': 'Radiology Services',
    'CONSULTATION': 'Consultation Services',
    'CARDIOLOGY': 'Cardiology Services',
    'DENTAL': 'Dental Services',
    'THERAPY': 'Therapy Services',
    'ADMINISTRATIVE': 'Administrative Fees',
    'PREVENTIVE': 'Preventive Care',
    'LABORATORY': 'Laboratory Tests',
    'default': 'Other Revenue'
  };
  
  if (!category) return categoryLabels['default'];
  
  // Try exact match first
  if (categoryLabels[category]) {
    return categoryLabels[category];
  }
  
  // Try uppercase match
  const upperCategory = category.toUpperCase();
  if (categoryLabels[upperCategory]) {
    return categoryLabels[upperCategory];
  }
  
  // Try lowercase match
  const lowerCategory = category.toLowerCase();
  if (categoryLabels[lowerCategory]) {
    return categoryLabels[lowerCategory];
  }
  
  // Return default
  return categoryLabels['default'];
};

interface FinancialData {
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    profitMargin: number;
    period: string;
    dateRange: { startDate?: string; endDate?: string };
    departmentId: string;
  };
  revenue: {
    breakdown: Array<{ 
      category: string; 
      category_label?: string; 
      display_name?: string;
      revenue: number; 
      transaction_count: number 
    }>;
    total: number;
  };
  expenses: {
    breakdown: Array<{ 
      category: string; 
      category_label?: string; 
      display_name?: string;
      expenses: number; 
      transaction_count: number 
    }>;
    total: number;
  };
  departments: Array<{ department_id: string; department_name: string }>;
  reportType: string;
  metadata: {
    generatedAt: string;
    currency: string;
    usingNewTables: boolean;
    hasLabelMapping?: boolean;
  };
}

export default function FinancialReportsPageFixed() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('income_statement');
  const [period, setPeriod] = useState('month');
  const [departmentId, setDepartmentId] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // CRITICAL DEBUG - VERSION 3.0 - TIMESTAMP: 2026-03-26T21:52:00
  useEffect(() => {
  }, []);

  const tabs = [
    { id: 'income_statement', label: 'Income Statement' },
    { id: 'balance_sheet', label: 'Balance Sheet' },
    { id: 'cash_flow', label: 'Cash Flow' },
    { id: 'trial_balance', label: 'Trial Balance' },
  ];

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        department_id: departmentId,
        report_type: activeTab,
      });
      
      if (startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
      }

      const response = await fetch(`/api/financial-dashboard?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setFinancialData(result.data);
      } else {
        console.error('Failed to fetch financial data:', result.error);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, [period, departmentId, startDate, endDate, activeTab]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderIncomeStatement = () => {
    if (!financialData) return null;

    return (
      <div className="max-w-2xl space-y-4">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold">Income Statement</h2>
          <p className="text-xs text-gray-500">
            For the period ending {formatDate(financialData.metadata.generatedAt)}
          </p>
        </div>

        {/* Revenue Section - NEW VERSION */}
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-sm font-semibold">Revenue</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {financialData.revenue.breakdown.map((item, index) => (
              // Use frontend label mapping as fallback - NEW
              <div key={index} className="flex justify-between py-1.5 text-sm">
                <span className="ml-6 text-gray-600">
                  {(() => {
                    const label = item.category_label || item.display_name || getCategoryLabel(item.category) || item.category;
                    return label;
                  })()}
                </span>
                <span className="font-medium">{formatCurrency(item.revenue)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5 text-sm font-bold border-t pt-2 mt-1">
              <span>Total Revenue</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(financialData.revenue.total)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Section - NEW VERSION */}
        <Card>
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-sm font-semibold">Expenses</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {financialData.expenses.breakdown.map((item, index) => (
              // Use frontend label mapping as fallback - NEW
              <div key={index} className="flex justify-between py-1.5 text-sm">
                <span className="ml-6 text-gray-600">
                  {(() => {
                    const label = item.category_label || item.display_name || getCategoryLabel(item.category) || item.category;
                    return label;
                  })()}
                </span>
                <span className="font-medium">{formatCurrency(item.expenses)}</span>
              </div>
            ))}
            <div className="flex justify-between py-1.5 text-sm font-bold border-t pt-2 mt-1">
              <span>Total Expenses</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(financialData.expenses.total)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Net Income - NEW VERSION */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between py-1.5 text-sm font-bold border-t pt-2 mt-1">
              <span>Net Income</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(financialData.summary.netIncome)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Balance Sheet report coming soon...</p>
      </div>
    );
  };

  const renderCashFlow = () => {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cash Flow report coming soon...</p>
      </div>
    );
  };

  const renderTrialBalance = () => {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Trial Balance report coming soon...</p>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'income_statement':
        return renderIncomeStatement();
      case 'balance_sheet':
        return renderBalanceSheet();
      case 'cash_flow':
        return renderCashFlow();
      case 'trial_balance':
        return renderTrialBalance();
      default:
        return renderIncomeStatement();
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
        <p className="text-gray-500 text-sm">Income Statement, Balance Sheet, Cash Flow, Trial Balance</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {financialData?.departments.map((dept) => (
                <SelectItem key={dept.department_id} value={dept.department_id}>
                  {dept.department_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <Button onClick={fetchFinancialData} disabled={loading}>
          <Calendar className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Report Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report Content */}
      {renderContent()}
    </div>
  );
}
