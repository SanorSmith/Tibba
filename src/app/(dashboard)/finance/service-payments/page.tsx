'use client';

import { useEffect, useState, useMemo } from 'react';
import { DollarSign, Plus, Search, Eye, Edit, Trash2, Calendar, CreditCard, CheckCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ServicePayment, ServiceInvoiceItem, ServiceBalanceSheet, Stakeholder } from '@/types/finance';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function ServicePaymentsPage() {
  const [mounted, setMounted] = useState(false);
  const [payments, setPayments] = useState<ServicePayment[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<ServiceBalanceSheet[]>([]);
  const [pendingItems, setPendingItems] = useState<ServiceInvoiceItem[]>([]);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [providerFilter, setProviderFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<ServicePayment | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    service_provider_id: '',
    payment_method: 'BANK_TRANSFER' as const,
    notes: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
    setMounted(true);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsRes, balanceRes, itemsRes, providersRes] = await Promise.all([
        fetch('/api/service-payments'),
        fetch('/api/service-balance-sheet'),
        fetch('/api/service-invoice-items?isPaid=false'),
        fetch('/api/service-invoice-items?isPaid=true')
      ]);

      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (balanceRes.ok) setBalanceSheet(await balanceRes.json());
      if (itemsRes.ok) setPendingItems(await itemsRes.json());
      
      // Get stakeholders for dropdown
      const stakeholdersRes = await fetch('/api/finance/stakeholders');
      if (stakeholdersRes.ok) setStakeholders(await stakeholdersRes.json());
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      const matchesSearch = !search || 
        payment.payment_number.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || payment.status === statusFilter;
      const matchesProvider = providerFilter === 'ALL' || payment.service_provider_id === providerFilter;
      return matchesSearch && matchesStatus && matchesProvider;
    });
  }, [payments, search, statusFilter, providerFilter]);

  const filteredPendingItems = useMemo(() => {
    if (!selectedProvider) return [];
    return pendingItems.filter(item => item.service_provider_id === selectedProvider);
  }, [pendingItems, selectedProvider]);

  const totalPendingAmount = useMemo(() => {
    return filteredPendingItems.reduce((sum, item) => sum + item.service_fee, 0);
  }, [filteredPendingItems]);

  const handleCreatePayment = async () => {
    if (!selectedProvider || !formData.payment_method) {
      toast.error('Please select a provider and payment method');
      return;
    }

    try {
      const payload = {
        service_provider_id: selectedProvider,
        total_amount: totalPendingAmount,
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        notes: formData.notes
      };

      const res = await fetch('/api/service-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const payment = await res.json();
        toast.success(`Payment ${payment.payment_number} created successfully`);
        setShowCreateModal(false);
        setSelectedProvider(null);
        setFormData({
          service_provider_id: '',
          payment_method: 'BANK_TRANSFER',
          notes: '',
          payment_date: new Date().toISOString().split('T')[0]
        });
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Error creating payment:', error);
      toast.error('Failed to create payment');
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-700';
      case 'PROCESSING': return 'bg-blue-100 text-blue-700';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const methodIcon = (method: string) => {
    switch (method) {
      case 'BANK_TRANSFER': return <CreditCard size={14} />;
      case 'CASH': return <DollarSign size={14} />;
      case 'CHECK': return <Calendar size={14} />;
      default: return <CreditCard size={14} />;
    }
  };

  if (!mounted) return (
    <div className="p-6">
      <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Share Payments</h1>
          <p className="text-gray-500 text-sm">Manage payments to service providers for rendered services</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-500 w-fit"
        >
          <Plus size={16} /> Create Payment
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Total Payments</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Pending Items</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingItems.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Total Paid</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {fmt(payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.total_amount, 0))} IQD
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Balance Due</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {fmt(balanceSheet.reduce((sum, b) => sum + b.balance_due, 0))} IQD
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by payment number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <select
          value={providerFilter}
          onChange={e => setProviderFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All Providers</option>
          {stakeholders.map(s => (
            <option key={s.stakeholder_id} value={s.stakeholder_id}>{s.name_ar}</option>
          ))}
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{payment.payment_number}</td>
                  <td className="px-4 py-3 text-sm">
                    {stakeholders.find(s => s.stakeholder_id === payment.service_provider_id)?.name_ar || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{fmt(payment.total_amount)} IQD</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      {methodIcon(payment.payment_method)}
                      <span>{payment.payment_method.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{payment.payment_date}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setSelectedPayment(payment);
                          setShowViewModal(true);
                        }}
                        className="text-xs px-2 py-1 border rounded text-blue-500 hover:bg-blue-50"
                      >
                        <Eye size={12} className="inline mr-1" /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    No payments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Payment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">Create Service Payment</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Service Provider *</label>
                  <select
                    value={selectedProvider || ''}
                    onChange={e => setSelectedProvider(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select Provider</option>
                    {stakeholders.map(s => (
                      <option key={s.stakeholder_id} value={s.stakeholder_id}>
                        {s.name_ar} ({s.service_type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Payment Method *</label>
                  <select
                    value={formData.payment_method}
                    onChange={e => setFormData({...formData, payment_method: e.target.value as any})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                    <option value="CHECK">Check</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Payment Date *</label>
                  <input
                    type="date"
                    value={formData.payment_date}
                    onChange={e => setFormData({...formData, payment_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Total Amount</label>
                  <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 font-medium">
                    {fmt(totalPendingAmount)} IQD
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Pending Items Preview */}
              {selectedProvider && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-sm mb-3">Pending Service Items ({filteredPendingItems.length})</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredPendingItems.map(item => (
                      <div key={item.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{item.service_name}</div>
                          <div className="text-xs text-gray-500">{item.patient_name} • {item.invoice_date}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{fmt(item.service_fee)} IQD</div>
                          <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                        </div>
                      </div>
                    ))}
                    {filteredPendingItems.length === 0 && (
                      <div className="text-center text-gray-400 py-4">No pending items for this provider</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePayment}
                disabled={!selectedProvider || totalPendingAmount === 0}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                Create Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Payment Modal */}
      {showViewModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">{selectedPayment.payment_number}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(selectedPayment.status)}`}>
                  {selectedPayment.status}
                </span>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500 block text-xs">Provider</span>
                  <div className="font-medium">
                    {stakeholders.find(s => s.stakeholder_id === selectedPayment.service_provider_id)?.name_ar}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Amount</span>
                  <div className="font-medium">{fmt(selectedPayment.total_amount)} IQD</div>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Payment Method</span>
                  <div className="font-medium">{selectedPayment.payment_method.replace('_', ' ')}</div>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Payment Date</span>
                  <div className="font-medium">{selectedPayment.payment_date}</div>
                </div>
              </div>
              {selectedPayment.notes && (
                <div>
                  <span className="text-gray-500 block text-xs">Notes</span>
                  <div className="font-medium">{selectedPayment.notes}</div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
