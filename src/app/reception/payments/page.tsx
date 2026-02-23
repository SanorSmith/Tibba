'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Edit, Trash2, CreditCard, Calendar, DollarSign, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

// Mock data - in production, this would come from the API
const mockPayments = [
  {
    transaction_id: '1',
    transaction_number: 'TXN-2024-00001',
    invoice_id: '1',
    invoice_number: 'INV-2024-00001',
    patient_id: '1',
    patient_name_ar: 'أحمد محمد',
    patient_name_en: 'Ahmed Mohammed',
    amount: 45000,
    payment_method: 'CASH',
    payment_status: 'COMPLETED',
    transaction_date: '2024-01-15',
    reference_number: 'CASH-001',
    notes: 'Full payment for consultation',
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    transaction_id: '2',
    transaction_number: 'TXN-2024-00002',
    invoice_id: '2',
    invoice_number: 'INV-2024-00002',
    patient_id: '2',
    patient_name_ar: 'فاطمة علي',
    patient_name_en: 'Fatima Ali',
    amount: 25000,
    payment_method: 'CARD',
    payment_status: 'COMPLETED',
    transaction_date: '2024-01-16',
    reference_number: 'CARD-1234',
    notes: 'Partial payment',
    created_at: '2024-01-16T00:00:00Z',
  },
  {
    transaction_id: '3',
    transaction_number: 'TXN-2024-00003',
    booking_id: '2',
    booking_number: 'BK-2024-00002',
    patient_id: '2',
    patient_name_ar: 'فاطمة علي',
    patient_name_en: 'Fatima Ali',
    amount: 50000,
    payment_method: 'BANK_TRANSFER',
    payment_status: 'PENDING',
    transaction_date: '2024-01-17',
    reference_number: 'BANK-5678',
    notes: 'Waiting for bank confirmation',
    created_at: '2024-01-17T00:00:00Z',
  },
];

export default function ReceptionPayments() {
  const [payments, setPayments] = useState(mockPayments);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [modal, setModal] = useState<'create' | 'edit' | 'view' | null>(null);
  const [currentPayment, setCurrentPayment] = useState<any>(null);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.transaction_number.toLowerCase().includes(search.toLowerCase()) ||
      payment.patient_name_ar.toLowerCase().includes(search.toLowerCase()) ||
      payment.patient_name_en?.toLowerCase().includes(search.toLowerCase()) ||
      payment.invoice_number?.toLowerCase().includes(search.toLowerCase()) ||
      payment.booking_number?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || payment.payment_status === statusFilter;
    const matchesMethod = methodFilter === 'ALL' || payment.payment_method === methodFilter;
    
    return matchesSearch && matchesStatus && matchesMethod;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'REFUNDED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle size={16} />;
      case 'PENDING': return <Clock size={16} />;
      case 'FAILED': return <XCircle size={16} />;
      case 'REFUNDED': return <AlertCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH': return <DollarSign size={16} />;
      case 'CARD': return <CreditCard size={16} />;
      case 'BANK_TRANSFER': return <AlertCircle size={16} />;
      default: return <CreditCard size={16} />;
    }
  };

  const openCreate = () => {
    setCurrentPayment({
      transaction_number: '',
      invoice_id: '',
      invoice_number: '',
      booking_id: '',
      booking_number: '',
      patient_id: '',
      patient_name_ar: '',
      patient_name_en: '',
      amount: 0,
      payment_method: 'CASH',
      payment_status: 'PENDING',
      transaction_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      notes: '',
    });
    setModal('create');
  };

  const openEdit = (payment: any) => {
    setCurrentPayment({ ...payment });
    setModal('edit');
  };

  const openView = (payment: any) => {
    setCurrentPayment(payment);
    setModal('view');
  };

  const handleSave = async () => {
    // Mock save function - in production, this would call the API
    console.log('Saving payment:', currentPayment);
    
    if (modal === 'create') {
      const newPayment = {
        ...currentPayment,
        transaction_id: Date.now().toString(),
        transaction_number: `TXN-2024-${String(payments.length + 1).padStart(5, '0')}`,
        created_at: new Date().toISOString(),
      };
      setPayments([...payments, newPayment]);
    } else if (modal === 'edit') {
      setPayments(payments.map(p => 
        p.transaction_id === currentPayment.transaction_id 
          ? currentPayment 
          : p
      ));
    }
    
    setModal(null);
  };

  const handleDelete = async (paymentId: string) => {
    if (confirm('Are you sure you want to delete this payment transaction?')) {
      setPayments(payments.filter(p => p.transaction_id !== paymentId));
    }
  };

  const updateStatus = async (paymentId: string, newStatus: string) => {
    setPayments(payments.map(p => 
      p.transaction_id === paymentId 
        ? { ...p, payment_status: newStatus }
        : p
    ));
  };

  const todayRevenue = payments
    .filter(p => p.transaction_date === new Date().toISOString().split('T')[0] && p.payment_status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalRevenue = payments
    .filter(p => p.payment_status === 'COMPLETED')
    .reduce((sum, p) => sum + p.amount, 0);
  
  const pendingAmount = payments
    .filter(p => p.payment_status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Transactions</h1>
          <p className="text-gray-500 text-sm">معاملات الدفع</p>
        </div>
        <button 
          onClick={openCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={16} />
          Process Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{todayRevenue.toLocaleString()} IQD</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{totalRevenue.toLocaleString()} IQD</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-orange-600">{pendingAmount.toLocaleString()} IQD</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="PENDING">Pending</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="ALL">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
        </select>
      </div>

      {/* Payments List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Transaction #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reference</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Amount</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.map((payment) => (
                <tr key={payment.transaction_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{payment.transaction_number}</td>
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium">{payment.patient_name_ar}</div>
                      <div className="text-xs text-gray-500">{payment.patient_name_en || '-'}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      {payment.invoice_number && (
                        <div className="text-xs font-mono text-blue-600">{payment.invoice_number}</div>
                      )}
                      {payment.booking_number && (
                        <div className="text-xs font-mono text-purple-600">{payment.booking_number}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span>{payment.transaction_date}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{payment.amount.toLocaleString()} IQD</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {getMethodIcon(payment.payment_method)}
                      <span className="ml-1">{payment.payment_method.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.payment_status)}`}>
                      {getStatusIcon(payment.payment_status)}
                      <span className="ml-1">{payment.payment_status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={() => openView(payment)}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Eye size={14} />
                      </button>
                      {payment.payment_status === 'PENDING' && (
                        <button 
                          onClick={() => openEdit(payment)}
                          className="p-1.5 hover:bg-gray-100 rounded"
                        >
                          <Edit size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(payment.transaction_id)}
                        className="p-1.5 hover:bg-red-50 rounded text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y">
          {filteredPayments.map((payment) => (
            <div key={payment.transaction_id} className="p-4 cursor-pointer hover:bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-mono text-xs text-gray-500">{payment.transaction_number}</div>
                  <div className="font-medium">{payment.patient_name_ar}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.payment_status)}`}>
                  {getStatusIcon(payment.payment_status)}
                  <span className="ml-1">{payment.payment_status}</span>
                </span>
              </div>
              <div className="flex gap-4 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {payment.transaction_date}
                </span>
                <span className="font-medium">{payment.amount.toLocaleString()} IQD</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openView(payment)}
                  className="p-1.5 hover:bg-gray-100 rounded text-sm"
                >
                  View
                </button>
                {payment.payment_status === 'PENDING' && (
                  <button 
                    onClick={() => openEdit(payment)}
                    className="p-1.5 hover:bg-gray-100 rounded text-sm"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {(modal === 'create' || modal === 'edit' || modal === 'view') && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {modal === 'create' ? 'Process Payment' : modal === 'edit' ? 'Edit Payment' : 'Payment Details'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Transaction Number</label>
                  <input
                    type="text"
                    value={currentPayment?.transaction_number || ''}
                    onChange={(e) => setCurrentPayment({...currentPayment, transaction_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Transaction Date</label>
                  <input
                    type="date"
                    value={currentPayment?.transaction_date || ''}
                    onChange={(e) => setCurrentPayment({...currentPayment, transaction_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Patient</label>
                  <select
                    value={currentPayment?.patient_id || ''}
                    onChange={(e) => setCurrentPayment({...currentPayment, patient_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="">Select Patient</option>
                    {/* In production, this would be populated from the patients API */}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Amount (IQD)</label>
                  <input
                    type="number"
                    value={currentPayment?.amount || 0}
                    onChange={(e) => setCurrentPayment({...currentPayment, amount: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Method</label>
                  <select
                    value={currentPayment?.payment_method || 'CASH'}
                    onChange={(e) => setCurrentPayment({...currentPayment, payment_method: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Status</label>
                  <select
                    value={currentPayment?.payment_status || 'PENDING'}
                    onChange={(e) => setCurrentPayment({...currentPayment, payment_status: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                    <option value="REFUNDED">Refunded</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Reference Number</label>
                  <input
                    type="text"
                    value={currentPayment?.reference_number || ''}
                    onChange={(e) => setCurrentPayment({...currentPayment, reference_number: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    disabled={modal === 'view'}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={currentPayment?.notes || ''}
                    onChange={(e) => setCurrentPayment({...currentPayment, notes: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={3}
                    disabled={modal === 'view'}
                  />
                </div>
              </div>
            </div>
            
            {modal !== 'view' && (
              <div className="p-4 border-t flex gap-2 justify-end">
                <button 
                  onClick={() => setModal(null)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
