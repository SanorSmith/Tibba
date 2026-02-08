'use client';

import { useState } from 'react';
import { Download, Shield, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function ComplianceReportsPage() {
  const [activeTab, setActiveTab] = useState('controlled');
  const [batchSearch, setBatchSearch] = useState('');

  const tabs = [
    { id: 'controlled', label: 'Controlled Substances Log' },
    { id: 'traceability', label: 'Batch Traceability' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  const controlledLog = [
    {
      id: 'CS-001',
      date: '2026-02-08 09:30',
      drug: 'Morphine Sulfate 10mg',
      batch: 'MOR-2025-12-001',
      quantity: 2,
      balance_before: 250,
      balance_after: 248,
      patient_id: 'PAT001',
      patient_name: 'Ali Mahmood',
      prescriber: 'Dr. Sarah Ahmed',
      dispensed_by: 'Sarah Ahmed (Pharmacist)',
      witness: 'Mohammed Ali (Pharmacist)',
    },
    {
      id: 'CS-002',
      date: '2026-02-08 08:15',
      drug: 'Morphine Sulfate 10mg',
      batch: 'MOR-2025-12-001',
      quantity: 50,
      balance_before: 200,
      balance_after: 250,
      patient_id: null,
      patient_name: null,
      prescriber: null,
      dispensed_by: 'Sarah Ahmed (Pharmacist)',
      witness: 'Fatima Hassan (Pharmacist)',
      action: 'RECEIVED',
    },
    {
      id: 'CS-003',
      date: '2026-02-07 16:45',
      drug: 'Morphine Sulfate 10mg',
      batch: 'MOR-2025-12-001',
      quantity: 1,
      balance_before: 201,
      balance_after: 200,
      patient_id: 'PAT002',
      patient_name: 'Fatima Hassan',
      prescriber: 'Dr. Ahmed Hassan',
      dispensed_by: 'Sarah Ahmed (Pharmacist)',
      witness: 'Khalid Ibrahim (Pharmacist)',
    },
  ];

  const traceabilityData = {
    batch_number: 'AMX-2025-10-002',
    item_name: 'Amoxicillin 500mg Capsule',
    manufacturer: 'GlaxoSmithKline',
    manufacturing_date: '2025-10-15',
    expiry_date: '2027-10-15',
    received_date: '2025-11-01',
    received_quantity: 1000,
    supplier: 'Medical Supplies Co.',
    current_locations: [
      { location: 'Main Pharmacy', quantity: 450 },
      { location: 'Ward 3A', quantity: 50 },
    ],
    dispensing_records: [
      {
        date: '2026-02-07',
        patient: 'Aisha Mohammed',
        mrn: 'MRN-2026-004',
        quantity: 21,
        dispensed_by: 'Sarah Ahmed',
      },
      {
        date: '2026-02-05',
        patient: 'Hassan Abdullah',
        mrn: 'MRN-2026-005',
        quantity: 14,
        dispensed_by: 'Sarah Ahmed',
      },
      {
        date: '2026-02-03',
        patient: 'Omar Khalid',
        mrn: 'MRN-2026-007',
        quantity: 21,
        dispensed_by: 'Mohammed Ali',
      },
    ],
  };

  const auditTrail = [
    {
      id: 'AUD-001',
      timestamp: '2026-02-08 10:30:15',
      user: 'Sarah Ahmed (Pharmacist)',
      action: 'DISPENSE',
      entity: 'Stock Balance',
      details: 'Dispensed 24 tablets of Paracetamol 500mg to patient Ali Mahmood',
      ip_address: '192.168.1.45',
    },
    {
      id: 'AUD-002',
      timestamp: '2026-02-08 09:15:30',
      user: 'Mohammed Ali (Lab Tech)',
      action: 'CONSUME',
      entity: 'Stock Balance',
      details: 'Used 1 CBC Reagent Kit for patient Hassan Abdullah',
      ip_address: '192.168.1.52',
    },
    {
      id: 'AUD-003',
      timestamp: '2026-02-08 08:45:12',
      user: 'Fatima Hassan (Procurement)',
      action: 'CREATE',
      entity: 'Purchase Requisition',
      details: 'Created PR-2026-003 for 500 units of Sterile Gloves',
      ip_address: '192.168.1.38',
    },
    {
      id: 'AUD-004',
      timestamp: '2026-02-07 16:30:45',
      user: 'Admin User',
      action: 'UPDATE',
      entity: 'Item Master',
      details: 'Updated reorder level for Amoxicillin 500mg from 100 to 150',
      ip_address: '192.168.1.10',
    },
    {
      id: 'AUD-005',
      timestamp: '2026-02-07 15:20:18',
      user: 'Sarah Ahmed (Pharmacist)',
      action: 'ACKNOWLEDGE',
      entity: 'Alert',
      details: 'Acknowledged low stock alert for N95 Masks',
      ip_address: '192.168.1.45',
    },
  ];

  const renderControlledSubstances = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{controlledLog.length}</div>
            <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">248</div>
            <p className="text-xs text-gray-500 mt-1">Morphine Sulfate 10mg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Discrepancies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">0</div>
            <p className="text-xs text-gray-500 mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Controlled Substances Transaction Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="tibbna-table-container">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Date/Time</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Drug</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Batch</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Qty</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Balance Before</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Balance After</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Patient</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Prescriber</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Dispensed By</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Witness</th>
                </tr>
              </thead>
              <tbody>
                {controlledLog.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm">{log.date}</td>
                    <td className="py-3 px-3 text-sm font-medium">{log.drug}</td>
                    <td className="py-3 px-3 text-sm">{log.batch}</td>
                    <td className="py-3 px-3 text-sm text-right">
                      <Badge variant={log.action === 'RECEIVED' ? 'success' : 'warning'}>
                        {log.action === 'RECEIVED' ? '+' : '-'}{log.quantity}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-sm text-right">{log.balance_before}</td>
                    <td className="py-3 px-3 text-sm text-right font-medium">{log.balance_after}</td>
                    <td className="py-3 px-3 text-sm">{log.patient_name || '-'}</td>
                    <td className="py-3 px-3 text-sm">{log.prescriber || '-'}</td>
                    <td className="py-3 px-3 text-sm">{log.dispensed_by}</td>
                    <td className="py-3 px-3 text-sm">{log.witness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderTraceability = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Batch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter batch number..."
              value={batchSearch}
              onChange={(e) => setBatchSearch(e.target.value)}
            />
            <Button>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">Batch Number:</label>
              <p className="font-medium">{traceabilityData.batch_number}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Item Name:</label>
              <p className="font-medium">{traceabilityData.item_name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Manufacturer:</label>
              <p className="font-medium">{traceabilityData.manufacturer}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Supplier:</label>
              <p className="font-medium">{traceabilityData.supplier}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Manufacturing Date:</label>
              <p className="font-medium">{new Date(traceabilityData.manufacturing_date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Expiry Date:</label>
              <p className="font-medium">{new Date(traceabilityData.expiry_date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Received Date:</label>
              <p className="font-medium">{new Date(traceabilityData.received_date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Received Quantity:</label>
              <p className="font-medium">{traceabilityData.received_quantity} units</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {traceabilityData.current_locations.map((loc, idx) => (
              <div key={idx} className="flex justify-between p-3 border rounded-lg">
                <span className="font-medium">{loc.location}</span>
                <span className="text-gray-600">{loc.quantity} units</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dispensing History (Patients Who Received This Batch)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="tibbna-table-container">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Date</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Patient Name</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">MRN</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Quantity</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Dispensed By</th>
                </tr>
              </thead>
              <tbody>
                {traceabilityData.dispensing_records.map((record, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm">{new Date(record.date).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-sm font-medium">{record.patient}</td>
                    <td className="py-3 px-3 text-sm">{record.mrn}</td>
                    <td className="py-3 px-3 text-sm text-right">{record.quantity}</td>
                    <td className="py-3 px-3 text-sm">{record.dispensed_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAuditTrail = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <Input type="date" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Users</option>
                <option value="sarah">Sarah Ahmed</option>
                <option value="mohammed">Mohammed Ali</option>
                <option value="fatima">Fatima Hassan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="DISPENSE">Dispense</option>
                <option value="CONSUME">Consume</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="tibbna-table-container">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Timestamp</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">User</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Action</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Entity</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Details</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditTrail.map((record) => (
                  <tr key={record.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3 text-sm">{record.timestamp}</td>
                    <td className="py-3 px-3 text-sm">{record.user}</td>
                    <td className="py-3 px-3">
                      <Badge variant={
                        record.action === 'CREATE' ? 'success' :
                        record.action === 'UPDATE' ? 'info' :
                        record.action === 'DELETE' ? 'error' : 'secondary'
                      }>
                        {record.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-sm">{record.entity}</td>
                    <td className="py-3 px-3 text-sm">{record.details}</td>
                    <td className="py-3 px-3 text-sm text-gray-500">{record.ip_address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Compliance Reports</h2>
          <p className="page-description">Regulatory compliance and audit trails</p>
        </div>
        </div>
        <Button variant="outline" onClick={() => alert('Exporting to PDF for regulatory submission... (Demo mode)')}>
          <Download className="w-4 h-4 mr-2" />
          Export for Submission
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

      {activeTab === 'controlled' && renderControlledSubstances()}
      {activeTab === 'traceability' && renderTraceability()}
      {activeTab === 'audit' && renderAuditTrail()}
    </div>
  );
}
