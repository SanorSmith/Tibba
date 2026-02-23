'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, Building2, Calendar, User, DollarSign, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ProviderInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  patient_name: string;
  patient_name_ar?: string;
  status: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  item_name: string;
  item_name_ar?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  provider_id: string;
  provider_name: string;
  service_fee: number;
  payment_status: string;
}

export default function ProviderInvoiceDetails() {
  const params = useParams();
  const router = useRouter();
  const providerId = params.providerId as string;
  
  const [invoices, setInvoices] = useState<ProviderInvoice[]>([]);
  const [provider, setProvider] = useState<{ name: string; id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [highlightedInvoice, setHighlightedInvoice] = useState<string | null>(null);

  // Handle invoice query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invoiceParam = urlParams.get('invoice');
    if (invoiceParam) {
      setSearchTerm(invoiceParam);
      setHighlightedInvoice(invoiceParam);
    }
  }, []);

  useEffect(() => {
    if (providerId) {
      fetchProviderInvoices();
    }
  }, [providerId]);

  const fetchProviderInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/service-provider-reports/${providerId}/invoices`);
      if (!response.ok) {
        throw new Error('Failed to fetch provider invoices');
      }
      const data = await response.json();
      setInvoices(data.invoices || []);
      setProvider(data.provider || null);
    } catch (error) {
      console.error('Error fetching provider invoices:', error);
      toast.error('Failed to load provider invoices');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const totalBalance = filteredInvoices.reduce((sum, inv) => sum + inv.balance_due, 0);
  const totalServiceFees = filteredInvoices.reduce((sum, inv) => 
    sum + inv.items.reduce((itemSum, item) => itemSum + (item.service_fee || 0), 0), 0
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/finance/service-provider-reports">
            <Button variant="outline" size="sm">
              <ArrowLeft size={16} className="mr-1" />
              Back to Reports
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Provider Invoice Details</h1>
            <p className="text-gray-600">
              {provider ? `${provider.name} (${provider.id})` : 'Loading...'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Total Invoices</div>
                <div className="text-xl font-bold">{filteredInvoices.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-500">Total Amount</div>
                <div className="text-xl font-bold truncate" style={{fontSize: 'clamp(1rem, 2.5vw, 1.25rem)'}}>{totalAmount.toLocaleString()} IQD</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <div>
                <div className="text-sm text-gray-500">Service Fees</div>
                <div className="text-xl font-bold text-emerald-600 truncate" style={{fontSize: 'clamp(1rem, 2.5vw, 1.25rem)'}}>{totalServiceFees.toLocaleString()} IQD</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              <div>
                <div className="text-sm text-gray-500">Balance Due</div>
                <div className="text-xl font-bold text-amber-600 truncate" style={{fontSize: 'clamp(1rem, 2.5vw, 1.25rem)'}}>{totalBalance.toLocaleString()} IQD</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by invoice number or patient..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full sm:w-32"
        >
          <option value="ALL">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PENDING">Pending</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="OVERDUE">Overdue</option>
        </select>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className={`overflow-hidden ${highlightedInvoice === invoice.invoice_number ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{invoice.invoice_number}</h3>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(invoice.invoice_date).toLocaleDateString()} • {invoice.patient_name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    invoice.status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                    invoice.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                    invoice.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                    invoice.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                    invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {invoice.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Amount:</span>
                  <span className="font-semibold truncate max-w-full">{invoice.total_amount.toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid:</span>
                  <span className="font-semibold text-emerald-600 truncate max-w-full">{invoice.amount_paid.toLocaleString()} IQD</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Balance Due:</span>
                  <span className="font-semibold text-amber-600 truncate max-w-full">{invoice.balance_due.toLocaleString()} IQD</span>
                </div>
                
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Service Items:</h4>
                  <div className="space-y-2">
                    {invoice.items.map((item, idx) => (
                      <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{item.item_name}</div>
                          <div className="text-xs text-gray-500">
                            Qty: {item.quantity} × {item.unit_price.toLocaleString()} IQD
                          </div>
                          <div className="text-xs text-gray-500">
                            Service Fee: {item.service_fee.toLocaleString()} IQD
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold truncate max-w-full">{item.subtotal.toLocaleString()} IQD</div>
                          <div className={`text-xs px-1 py-0.5 rounded ${
                            item.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {item.payment_status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-4" />
            <p>No invoices found for this provider</p>
          </div>
        </div>
      )}
    </div>
  );
}
