'use client';

import { useState } from 'react';
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ControlledSubstancesPage() {
  const [showReconciliation, setShowReconciliation] = useState(false);

  const controlledLog = [
    {
      id: 'CS-001',
      date: '2026-02-08 09:30',
      item: 'Morphine Sulfate 10mg',
      action: 'DISPENSED',
      quantity: 2,
      patient: 'Ali Mahmood',
      pharmacist: 'Sarah Ahmed',
      witness: 'Mohammed Ali',
      balance: 248,
    },
    {
      id: 'CS-002',
      date: '2026-02-08 08:15',
      item: 'Morphine Sulfate 10mg',
      action: 'RECEIVED',
      quantity: 50,
      supplier: 'GlaxoSmithKline',
      pharmacist: 'Sarah Ahmed',
      witness: 'Fatima Hassan',
      balance: 250,
    },
  ];

  return (
    <div style={{ display: 'contents' }}>
      <div className="page-header-section">
        <div>
        <h2 className="page-title">Controlled Substances</h2>
        <p className="page-description">Manage controlled medications with dual signature</p>
      </div>
        </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Items</CardTitle>
            <Shield className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-gray-500 mt-1">Controlled substances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Current Balance</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">248</div>
            <p className="text-xs text-gray-500 mt-1">Units on hand</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Discrepancies</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">0</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setShowReconciliation(!showReconciliation)}>
          Daily Reconciliation
        </Button>
        <Button variant="outline">Physical Count</Button>
        <Button variant="outline">Report Discrepancy</Button>
      </div>

      {showReconciliation && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Daily Reconciliation - Morphine Sulfate 10mg</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Balance
                </label>
                <input
                  type="number"
                  value="248"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Physical Count
                </label>
                <input
                  type="number"
                  placeholder="Enter count"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pharmacist Signature
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Witness Signature
                </label>
                <input
                  type="text"
                  placeholder="Enter name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button>Submit Reconciliation</Button>
              <Button variant="outline" onClick={() => setShowReconciliation(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transaction Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="tibbna-table-container">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Date/Time</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Item</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Action</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Quantity</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Patient/Supplier</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Pharmacist</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Witness</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Balance</th>
                </tr>
              </thead>
              <tbody>
                {controlledLog.map(log => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm">{log.date}</td>
                    <td className="py-3 px-3 text-sm font-medium">{log.item}</td>
                    <td className="py-3 px-3">
                      <Badge variant={log.action === 'DISPENSED' ? 'warning' : 'success'}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-sm">{log.quantity}</td>
                    <td className="py-3 px-3 text-sm">{log.patient || log.supplier}</td>
                    <td className="py-3 px-3 text-sm">{log.pharmacist}</td>
                    <td className="py-3 px-3 text-sm">{log.witness}</td>
                    <td className="py-3 px-3 text-sm font-medium">{log.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
