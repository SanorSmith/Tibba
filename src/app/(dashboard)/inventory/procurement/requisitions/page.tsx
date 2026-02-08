'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import procurementData from '@/data/inventory/procurement.json';

export default function RequisitionsPage() {
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredPRs = procurementData.purchase_requisitions.filter(pr => 
    statusFilter === 'all' || pr.status === statusFilter
  );

  return (
    <div style={{ display: 'contents' }}>
      <div className="flex items-center justify-between">
        <div className="page-header-section">
        <div>
          <h2 className="page-title">Purchase Requisitions</h2>
          <p className="page-description">Create and manage purchase requests</p>
        </div>
        </div>
        <Link href="/inventory/procurement/requisitions/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create New PR
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
          variant={statusFilter === 'DRAFT' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('DRAFT')}
        >
          Draft
        </Button>
        <Button
          variant={statusFilter === 'SUBMITTED' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('SUBMITTED')}
        >
          Submitted
        </Button>
        <Button
          variant={statusFilter === 'APPROVED' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('APPROVED')}
        >
          Approved
        </Button>
      </div>

      <div className="space-y-3">
        {filteredPRs.map(pr => (
          <Link key={pr.id} href={`/inventory/procurement/requisitions/${pr.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold text-lg">{pr.pr_number}</span>
                      <Badge variant={
                        pr.status === 'APPROVED' ? 'success' :
                        pr.status === 'SUBMITTED' ? 'warning' :
                        pr.status === 'CONVERTED' ? 'info' : 'secondary'
                      }>
                        {pr.status}
                      </Badge>
                      <Badge variant={
                        pr.urgency === 'URGENT' ? 'error' :
                        pr.urgency === 'HIGH' ? 'warning' : 'secondary'
                      }>
                        {pr.urgency}
                      </Badge>
                    </div>
                    <p className="text-gray-700 mb-2">{pr.justification}</p>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{pr.items.length} items</span>
                      <span>Total: ${pr.total_amount.toFixed(2)}</span>
                      <span>Required by: {pr.required_by_date}</span>
                      <span>Requested by: {pr.requested_by}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{pr.required_by_date}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
