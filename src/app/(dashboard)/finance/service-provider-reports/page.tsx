'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Search, Building2, TrendingUp, DollarSign, FileText } from 'lucide-react';

interface ServiceProvider {
  provider_id: string;
  provider_name: string;
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  last_payment_date: string | null;
  invoice_numbers: string[];
}

interface PaymentRecord {
  id: string;
  invoice_number: string;
  invoice_date: string;
  patient_name: string;
  service_name: string;
  quantity: number;
  service_fee: number;
  total_fee: number;
  payment_batch_id: string;
  payment_date: string;
  provider_name: string;
  provider_id: string;
  invoice_status: string;
}

export default function ServiceProviderReports() {
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<string>('ALL');
  const [invoiceStatus, setInvoiceStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [showPayments, setShowPayments] = useState(false);

  useEffect(() => {
    fetchProviderReports();
  }, []);

  const fetchProviderReports = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/service-provider-reports?t=${Date.now()}`);
      const data = await response.json();
      setProviders(data.providers || []);
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Error fetching provider reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.provider_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = selectedProvider === 'ALL' || provider.provider_id === selectedProvider;
    return matchesSearch && matchesProvider;
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.provider_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.patient_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProvider = selectedProvider === 'ALL' || payment.provider_id === selectedProvider;
    const matchesInvoiceStatus = invoiceStatus === 'ALL' || payment.invoice_status === invoiceStatus;
    
    let matchesDate = true;
    if (dateRange !== 'ALL') {
      const paymentDate = new Date(payment.payment_date);
      const now = new Date();
      if (dateRange === '30') {
        matchesDate = paymentDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRange === '90') {
        matchesDate = paymentDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      }
    }
    
    return matchesSearch && matchesProvider && matchesInvoiceStatus && matchesDate;
  });

  const totalPaidAmount = filteredProviders.reduce((sum, p) => sum + p.paid_amount, 0);
  const totalPendingAmount = filteredProviders.reduce((sum, p) => sum + p.pending_amount, 0);
  const totalProviders = filteredProviders.length;

  const exportToCSV = () => {
    const data = showPayments ? filteredPayments : filteredProviders.map(p => ({
      'Provider Name': p.provider_name,
      'Provider ID': p.provider_id,
      'Total Invoices': p.total_invoices,
      'Total Amount': p.total_amount,
      'Paid Amount': p.paid_amount,
      'Pending Amount': p.pending_amount,
      'Last Payment Date': p.last_payment_date || 'Never'
    }));

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-provider-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Provider Reports</h1>
          <p className="text-gray-500 text-sm">Track payments made to service providers</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showPayments ? "outline" : "default"}
            onClick={() => setShowPayments(false)}
            className="flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            Provider Summary
          </Button>
          <Button
            variant={showPayments ? "default" : "outline"}
            onClick={() => setShowPayments(true)}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Payment Details
          </Button>
          <Button onClick={exportToCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Total Providers</div>
          <div className="text-lg font-bold text-gray-900">{totalProviders}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Total Paid</div>
          <div className="text-lg font-bold text-emerald-600 truncate" style={{fontSize: 'clamp(0.875rem, 2vw, 1.125rem)'}}>{totalPaidAmount.toLocaleString()} IQD</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Total Pending</div>
          <div className="text-lg font-bold text-amber-600 truncate" style={{fontSize: 'clamp(0.875rem, 2vw, 1.125rem)'}}>{totalPendingAmount.toLocaleString()} IQD</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500 mb-1">Payment Coverage</div>
          <div className="text-lg font-bold text-blue-600">
            {totalPaidAmount + totalPendingAmount > 0 
              ? Math.round((totalPaidAmount / (totalPaidAmount + totalPendingAmount)) * 100)
              : 0}%
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search by provider, invoice, or patient..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          value={selectedProvider} 
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full sm:w-48"
        >
          <option value="ALL">All Providers</option>
          {providers.map(provider => (
            <option key={provider.provider_id} value={provider.provider_id}>
              {provider.provider_name}
            </option>
          ))}
        </select>
        <select 
          value={dateRange} 
          onChange={(e) => setDateRange(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full sm:w-32"
        >
          <option value="ALL">All Time</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
        <select 
          value={invoiceStatus} 
          onChange={(e) => setInvoiceStatus(e.target.value)}
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

      {/* Data Display */}
      {!showPayments ? (
        /* Provider Summary View */
        <div className="space-y-4">
          {filteredProviders.map(provider => (
            <Card key={provider.provider_id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{provider.provider_name}</h3>
                        <p className="text-xs text-gray-500">ID: {provider.provider_id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total Invoices</div>
                      <div className="text-lg font-bold">{provider.total_invoices}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-gray-50 rounded">
                      <div className="text-xs text-gray-500">Total Amount</div>
                      <div className="text-lg font-bold text-gray-900 truncate" style={{fontSize: 'clamp(0.875rem, 2vw, 1.125rem)'}}>{provider.total_amount.toLocaleString()} IQD</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded">
                      <div className="text-xs text-emerald-600">Paid Amount</div>
                      <div className="text-lg font-bold text-emerald-600 truncate" style={{fontSize: 'clamp(0.875rem, 2vw, 1.125rem)'}}>{provider.paid_amount.toLocaleString()} IQD</div>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded">
                      <div className="text-xs text-amber-600">Pending Amount</div>
                      <div className="text-lg font-bold text-amber-600 truncate" style={{fontSize: 'clamp(0.875rem, 2vw, 1.125rem)'}}>{provider.pending_amount.toLocaleString()} IQD</div>
                    </div>
                  </div>
                  {provider.invoice_numbers && provider.invoice_numbers.length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 mb-2 font-medium">Invoice Report:</div>
                      <div className="space-y-1">
                        {payments
                          .filter(payment => payment.provider_id === provider.provider_id)
                          .map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <a
                                  href={`/finance/service-provider-reports/${provider.provider_id}?invoice=${payment.invoice_number}`}
                                  className="font-mono text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <FileText size={10} />
                                  {payment.invoice_number}
                                </a>
                                <span className="text-gray-600">{payment.patient_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold truncate max-w-full">{payment.service_fee.toLocaleString()} IQD</span>
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  payment.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                  payment.invoice_status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {payment.invoice_status}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                  {provider.last_payment_date && (
                    <div className="mt-3 text-xs text-gray-500">
                      Last Payment: {new Date(provider.last_payment_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Payment Details View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left">Provider</th>
                    <th className="px-4 py-2 text-left">Invoice #</th>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Patient</th>
                    <th className="px-4 py-2 text-left">Service</th>
                    <th className="px-4 py-2 text-right">Fee/Unit</th>
                    <th className="px-4 py-2 text-right">Total Fee</th>
                    <th className="px-4 py-2 text-left">Invoice Status</th>
                    <th className="px-4 py-2 text-left">Payment Date</th>
                    <th className="px-4 py-2 text-left">Batch ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">{payment.provider_name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-blue-600">{payment.invoice_number}</td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{payment.invoice_date}</td>
                      <td className="px-4 py-2">{payment.patient_name}</td>
                      <td className="px-4 py-2 text-gray-700">{payment.service_name}</td>
                      <td className="px-4 py-2 text-right truncate max-w-full">{payment.service_fee.toLocaleString()} IQD</td>
                      <td className="px-4 py-2 text-right font-semibold truncate max-w-full">{payment.total_fee.toLocaleString()} IQD</td>
                      <td className="px-4 py-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          payment.invoice_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' :
                          payment.invoice_status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          payment.invoice_status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                          payment.invoice_status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                          payment.invoice_status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {payment.invoice_status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs">{payment.payment_date}</td>
                      <td className="px-4 py-2 font-mono text-xs">{payment.payment_batch_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
