'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TransfersPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const mockTransfers = [
    {
      id: 'TRF-001',
      transfer_number: 'TRF-2026-001',
      from_location: 'Main Pharmacy',
      to_location: 'Ward 3A',
      item_name: 'Paracetamol 500mg',
      quantity: 100,
      status: 'COMPLETED',
      requested_by: 'Nurse Ahmed',
      date: '2026-02-08',
    },
    {
      id: 'TRF-002',
      transfer_number: 'TRF-2026-002',
      from_location: 'Main Pharmacy',
      to_location: 'ICU',
      item_name: 'Epinephrine 1mg',
      quantity: 10,
      status: 'PENDING',
      requested_by: 'Dr. Sarah',
      date: '2026-02-08',
      urgency: 'URGENT',
    },
    {
      id: 'TRF-003',
      transfer_number: 'TRF-2026-003',
      from_location: 'Central Warehouse',
      to_location: 'Main Laboratory',
      item_name: 'CBC Reagent Kit',
      quantity: 5,
      status: 'IN_TRANSIT',
      requested_by: 'Mohammed Ali',
      date: '2026-02-07',
    },
  ];

  const filteredTransfers = mockTransfers.filter(t => 
    statusFilter === 'all' || t.status === statusFilter
  );

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Stock Transfers</h2>
          <p className="page-description">Manage inter-location stock transfers</p>
        </div>
        </div>
        <Link href="/inventory/transfers/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Transfer
          </Button>
        </Link>
      </div>

      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button
          variant={statusFilter === 'PENDING' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending
        </Button>
        <Button
          variant={statusFilter === 'IN_TRANSIT' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('IN_TRANSIT')}
        >
          In Transit
        </Button>
        <Button
          variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('COMPLETED')}
        >
          Completed
        </Button>
      </div>

      <div className="space-y-3">
        {filteredTransfers.map(transfer => (
          <Card key={transfer.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowRightLeft className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-lg">{transfer.transfer_number}</span>
                    <Badge variant={
                      transfer.status === 'COMPLETED' ? 'success' :
                      transfer.status === 'IN_TRANSIT' ? 'info' :
                      transfer.status === 'PENDING' ? 'warning' : 'secondary'
                    }>
                      {transfer.status.replace('_', ' ')}
                    </Badge>
                    {transfer.urgency === 'URGENT' && (
                      <Badge variant="error">URGENT</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">From:</span>
                      <p className="font-medium">{transfer.from_location}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">To:</span>
                      <p className="font-medium">{transfer.to_location}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Item:</span>
                      <p className="font-medium">{transfer.item_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Quantity:</span>
                      <p className="font-medium">{transfer.quantity}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Requested by:</span>
                      <p className="font-medium">{transfer.requested_by}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <p className="font-medium">{transfer.date}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {transfer.status === 'PENDING' && (
                    <>
                      <Button size="sm" variant="outline">Approve</Button>
                      <Button size="sm" variant="outline">Issue</Button>
                    </>
                  )}
                  {transfer.status === 'IN_TRANSIT' && (
                    <Button size="sm" variant="outline">Receive</Button>
                  )}
                  <Button size="sm" variant="outline">View</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
