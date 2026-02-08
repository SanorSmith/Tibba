'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TrendingDown, User, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function ConsumptionPage() {
  const mockConsumption = [
    {
      id: 'CONS-001',
      date: '2026-02-08 10:30',
      item_name: 'Paracetamol 500mg',
      quantity: 24,
      patient_name: 'Ali Mahmood Al-Bayati',
      patient_mrn: 'MRN-2026-001',
      department: 'Emergency',
      performed_by: 'Nurse Ahmed',
      charge_amount: 3.60,
    },
    {
      id: 'CONS-002',
      date: '2026-02-08 09:15',
      item_name: 'Sterile Gloves - Medium',
      quantity: 2,
      patient_name: 'Fatima Hassan',
      patient_mrn: 'MRN-2026-002',
      department: 'Surgery',
      performed_by: 'Dr. Sarah',
      charge_amount: 3.00,
    },
    {
      id: 'CONS-003',
      date: '2026-02-07 16:45',
      item_name: 'IV Cannula 20G',
      quantity: 1,
      patient_name: 'Mohammed Ali',
      patient_mrn: 'MRN-2026-003',
      department: 'ICU',
      performed_by: 'Nurse Khalid',
      charge_amount: 2.50,
    },
  ];

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Consumption Tracking</h2>
          <p className="page-description">Track patient-linked inventory consumption</p>
        </div>
        </div>
        <Link href="/inventory/consumption/patient-linked">
          <Button>
            <Package className="w-4 h-4 mr-2" />
            Record Consumption
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Consumption</CardTitle>
            <TrendingDown className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">27</div>
            <p className="text-xs text-gray-500 mt-1">Items consumed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Charges</CardTitle>
            <Package className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">$125.40</div>
            <p className="text-xs text-gray-500 mt-1">Billed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Patients</CardTitle>
            <User className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">15</div>
            <p className="text-xs text-gray-500 mt-1">Unique patients</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Consumption Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="tibbna-table-container">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Date/Time</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Patient</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Item</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Quantity</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Department</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Performed By</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Charge</th>
                </tr>
              </thead>
              <tbody>
                {mockConsumption.map(record => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm">{record.date}</td>
                    <td className="py-3 px-3 text-sm">
                      <div className="font-medium">{record.patient_name}</div>
                      <div className="text-xs text-gray-500">{record.patient_mrn}</div>
                    </td>
                    <td className="py-3 px-3 text-sm font-medium">{record.item_name}</td>
                    <td className="py-3 px-3 text-sm">{record.quantity}</td>
                    <td className="py-3 px-3 text-sm">
                      <Badge variant="outline">{record.department}</Badge>
                    </td>
                    <td className="py-3 px-3 text-sm">{record.performed_by}</td>
                    <td className="py-3 px-3 text-sm font-medium">${record.charge_amount.toFixed(2)}</td>
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
