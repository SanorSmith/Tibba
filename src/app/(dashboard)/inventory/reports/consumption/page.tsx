'use client';

import { useState } from 'react';
import { Download, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import consumptionData from '@/data/inventory/consumption-report.json';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ConsumptionReportPage() {
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [patientLinkedOnly, setPatientLinkedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const filteredRecords = consumptionData.consumption_records.filter(record => {
    const matchesDepartment = departmentFilter === 'all' || record.department === departmentFilter;
    const matchesPatientLinked = !patientLinkedOnly || record.patient_id !== null;
    return matchesDepartment && matchesPatientLinked;
  });

  const totalItems = filteredRecords.length;
  const totalValue = filteredRecords.reduce((sum, r) => sum + r.total_cost, 0);
  const billableAmount = filteredRecords.filter(r => r.is_billable).reduce((sum, r) => sum + r.total_cost, 0);
  
  const departmentCounts = filteredRecords.reduce((acc, r) => {
    acc[r.department] = (acc[r.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topDepartment = Object.entries(departmentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  const trendData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];
    
    const count = consumptionData.consumption_records.filter(r => 
      r.date.startsWith(dateStr)
    ).length;
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: count || Math.floor(Math.random() * 10) + 5,
    };
  });

  const departmentData = Object.entries(
    filteredRecords.reduce((acc, r) => {
      acc[r.department] = (acc[r.department] || 0) + r.total_cost;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  const topItemsData = Object.entries(
    filteredRecords.reduce((acc, r) => {
      acc[r.item_name] = (acc[r.item_name] || 0) + r.total_cost;
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }));

  const COLORS = ['#5B7FE8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  const paginatedData = filteredRecords.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(filteredRecords.length / rowsPerPage);

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Consumption Report</h2>
          <p className="page-description">Analyze inventory consumption patterns</p>
        </div>
        </div>
        <Button variant="outline" onClick={() => alert('Exporting to Excel... (Demo mode)')}>
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Items Consumed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-gray-500 mt-1">Records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">At cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Billable Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${billableAmount.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Patient charges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Top Consumer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{topDepartment}</div>
            <p className="text-xs text-gray-500 mt-1">Department</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Departments</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="Surgery">Surgery</option>
                <option value="Emergency">Emergency</option>
                <option value="ICU">ICU</option>
              </select>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={patientLinkedOnly}
                  onChange={(e) => setPatientLinkedOnly(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Patient-Linked Only</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consumption Trend (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="count" stroke="#5B7FE8" strokeWidth={2} name="Items Consumed" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Consumption by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#5B7FE8" name="Value ($)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Items by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topItemsData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.substring(0, 15)}...: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {topItemsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Consumption Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="tibbna-table-container">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Item</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Department</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Location</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Quantity</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Unit Cost</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Total Cost</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Patient</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">User</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm">{new Date(record.date).toLocaleString()}</td>
                    <td className="py-3 px-3 text-sm font-medium">{record.item_name}</td>
                    <td className="py-3 px-3 text-sm">
                      <Badge variant="outline">{record.department}</Badge>
                    </td>
                    <td className="py-3 px-3 text-sm">{record.location}</td>
                    <td className="py-3 px-3 text-sm text-right">{record.quantity}</td>
                    <td className="py-3 px-3 text-sm text-right">${record.unit_cost.toFixed(2)}</td>
                    <td className="py-3 px-3 text-sm text-right font-medium">${record.total_cost.toFixed(2)}</td>
                    <td className="py-3 px-3 text-sm">
                      {record.patient_name || <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="py-3 px-3 text-sm">{record.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, filteredRecords.length)} of {filteredRecords.length} records
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
