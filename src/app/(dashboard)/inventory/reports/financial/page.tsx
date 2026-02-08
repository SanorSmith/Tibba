'use client';

import { useState } from 'react';
import { Download, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import financialData from '@/data/inventory/financial-reports.json';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function FinancialReportsPage() {
  const [activeTab, setActiveTab] = useState('valuation');

  const COLORS = ['#5B7FE8', '#10b981', '#f59e0b', '#ef4444'];

  const tabs = [
    { id: 'valuation', label: 'Inventory Valuation' },
    { id: 'cogs', label: 'Cost of Goods Sold' },
    { id: 'wastage', label: 'Wastage Report' },
  ];

  const renderValuation = () => {
    const categoryData = financialData.inventory_valuation.categories.map(cat => ({
      name: cat.category,
      value: cat.total_value,
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Inventory Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${financialData.inventory_valuation.total_value.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">As of {financialData.inventory_valuation.as_of_date}</p>
            </CardContent>
          </Card>

          {financialData.inventory_valuation.categories.map((cat, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{cat.category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${cat.total_value.toLocaleString()}</div>
                <p className="text-xs text-gray-500 mt-1">{cat.percentage}% of total</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Value Distribution by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {financialData.inventory_valuation.categories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{cat.category}</div>
                      <div className="text-sm text-gray-600">{cat.total_quantity.toLocaleString()} units</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${cat.total_value.toLocaleString()}</div>
                      <div className="text-sm text-gray-600">{cat.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderCOGS = () => {
    const cogsData = financialData.cogs_monthly.map(month => ({
      month: new Date(month.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      cogs: month.cogs,
      purchases: month.purchases,
    }));

    const latestMonth = financialData.cogs_monthly[financialData.cogs_monthly.length - 1];

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>COGS Calculation - {new Date(latestMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-lg">
              <div className="flex justify-between">
                <span className="text-gray-600">Opening Stock:</span>
                <span className="font-medium">${latestMonth.opening_stock.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">+ Purchases:</span>
                <span className="font-medium text-green-600">+ ${latestMonth.purchases.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">- Closing Stock:</span>
                <span className="font-medium text-red-600">- ${latestMonth.closing_stock.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-3 border-t-2">
                <span className="font-semibold">= Cost of Goods Sold:</span>
                <span className="font-bold text-xl">${latestMonth.cogs.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>COGS Trend (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cogsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="cogs" stroke="#ef4444" strokeWidth={2} name="COGS" />
                <Line type="monotone" dataKey="purchases" stroke="#10b981" strokeWidth={2} name="Purchases" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly COGS Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Month</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Opening Stock</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Purchases</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Closing Stock</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">COGS</th>
                  </tr>
                </thead>
                <tbody>
                  {financialData.cogs_monthly.map((month, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 text-sm">{new Date(month.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                      <td className="py-3 px-3 text-sm text-right">${month.opening_stock.toLocaleString()}</td>
                      <td className="py-3 px-3 text-sm text-right text-green-600">${month.purchases.toLocaleString()}</td>
                      <td className="py-3 px-3 text-sm text-right">${month.closing_stock.toLocaleString()}</td>
                      <td className="py-3 px-3 text-sm text-right font-medium">${month.cogs.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderWastage = () => {
    const totalWastage = financialData.wastage_records.reduce((sum, r) => sum + r.total_value, 0);
    const wastageByReason = Object.entries(
      financialData.wastage_records.reduce((acc, r) => {
        acc[r.reason] = (acc[r.reason] || 0) + r.total_value;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Wastage Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${totalWastage.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Expiry Wastage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${financialData.wastage_records.filter(r => r.reason === 'EXPIRED').reduce((sum, r) => sum + r.total_value, 0).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Due to expiry</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Damage Wastage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${financialData.wastage_records.filter(r => r.reason === 'DAMAGED').reduce((sum, r) => sum + r.total_value, 0).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Due to damage</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Other Wastage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${financialData.wastage_records.filter(r => r.reason === 'CONTAMINATED').reduce((sum, r) => sum + r.total_value, 0).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Other reasons</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Wastage by Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={wastageByReason}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {wastageByReason.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wastage Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Item</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Batch</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Quantity</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Value</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Reason</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {financialData.wastage_records.map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-3 text-sm">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="py-3 px-3 text-sm font-medium">{record.item_name}</td>
                      <td className="py-3 px-3 text-sm">{record.batch_number}</td>
                      <td className="py-3 px-3 text-sm text-right">{record.quantity}</td>
                      <td className="py-3 px-3 text-sm text-right font-medium text-red-600">${record.total_value.toFixed(2)}</td>
                      <td className="py-3 px-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${
                          record.reason === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                          record.reason === 'DAMAGED' ? 'bg-orange-100 text-orange-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {record.reason}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-sm">{record.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Financial Reports</h2>
          <p className="page-description">Inventory valuation and financial analysis</p>
        </div>
        </div>
        <Button variant="outline" onClick={() => alert('Exporting to PDF... (Demo mode)')}>
          <Download className="w-4 h-4 mr-2" />
          Export PDF
        </Button>
      </div>

      <div className="flex gap-2 border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'valuation' && renderValuation()}
      {activeTab === 'cogs' && renderCOGS()}
      {activeTab === 'wastage' && renderWastage()}
    </div>
  );
}
