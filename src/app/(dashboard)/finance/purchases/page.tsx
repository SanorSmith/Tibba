'use client';

import { useEffect, useState, useMemo } from 'react';
import { ShoppingCart, Plus, Search, Eye, X, CheckCircle, Clock, FileText, XCircle, AlertCircle, User } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

interface PurchaseRequest {
  id: string;
  request_number: string;
  request_date: string;
  requested_by: string;
  department: string;
  item_name: string;
  item_name_ar: string;
  item_description: string;
  category: string;
  quantity: number;
  unit: string;
  estimated_unit_price: number;
  estimated_total_price: number;
  priority: string;
  required_by_date: string;
  status: string;
  reviewed_by: string;
  reviewed_at: string;
  approval_comments: string;
  decline_reason: string;
  preferred_supplier: string;
  justification: string;
  notes: string;
}

export default function PurchasesPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [mounted, setMounted] = useState(false);
  const [viewRequest, setViewRequest] = useState<PurchaseRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<PurchaseRequest | null>(null);
  const [approvalAction, setApprovalAction] = useState<'APPROVED' | 'DECLINED' | 'MORE_INFO_NEEDED'>('APPROVED');
  const [reviewerName, setReviewerName] = useState('');
  const [comments, setComments] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadRequests(); setMounted(true); }, []);
  
  const loadRequests = async () => {
    try {
      const res = await fetch('/api/purchase-requests');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Failed to load purchase requests');
    }
  };

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    declined: requests.filter(r => r.status === 'DECLINED').length,
    totalValue: requests.reduce((s, r) => s + r.estimated_total_price, 0),
  }), [requests]);

  const filteredRequests = requests.filter(r => {
    const matchesSearch = !searchQuery || 
      r.request_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.requested_by.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || r.status === filterStatus;
    const matchesPriority = !filterPriority || r.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700';
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'DECLINED': return 'bg-red-100 text-red-700';
      case 'MORE_INFO_NEEDED': return 'bg-blue-100 text-blue-700';
      case 'PROCESSING': return 'bg-purple-100 text-purple-700';
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700';
      case 'LOW': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const openApprovalModal = (request: PurchaseRequest, action: 'APPROVED' | 'DECLINED' | 'MORE_INFO_NEEDED') => {
    setApprovingRequest(request);
    setApprovalAction(action);
    setComments('');
    setReviewerName('');
    setShowApprovalModal(true);
  };

  const handleApprovalAction = async () => {
    if (!approvingRequest || !reviewerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    const actionText = approvalAction === 'APPROVED' ? 'approved' : approvalAction === 'DECLINED' ? 'declined' : 'marked for more info';

    try {
      const res = await fetch(`/api/purchase-requests/${approvingRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: approvalAction, reviewed_by: reviewerName, comments }),
      });

      if (res.ok) {
        const updated = await res.json();
        setRequests(prev => prev.map(r => r.id === approvingRequest.id ? updated : r));
        setShowApprovalModal(false);
        setApprovingRequest(null);
        setViewRequest(null);
        toast.success(`Request ${actionText}`);
      } else {
        const err = await res.json();
        // DB unavailable — update UI locally so it still works
        const updatedRequest = { ...approvingRequest, status: approvalAction, reviewed_by: reviewerName, approval_comments: comments };
        setRequests(prev => prev.map(r => r.id === approvingRequest.id ? updatedRequest : r));
        setShowApprovalModal(false);
        setApprovingRequest(null);
        setViewRequest(null);
        toast.warning(`Request ${actionText} (offline mode — changes not saved to database: ${err.error || res.status})`);
      }
    } catch (error) {
      console.error('Approval action error:', error);
      toast.error('Network error — could not reach server');
    }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Requests</h1>
          <p className="text-gray-500 text-sm">Manage and approve purchase requests</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Declined</div>
          <div className="text-2xl font-bold text-red-600">{stats.declined}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Total Value</div>
          <div className="text-lg font-bold text-gray-900">{fmt(stats.totalValue)} IQD</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="DECLINED">Declined</option>
            <option value="MORE_INFO_NEEDED">More Info Needed</option>
            <option value="PROCESSING">Processing</option>
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Priority</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Request #</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Requested By</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Department</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Item</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Priority</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Est. Total</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredRequests.map(req => (
              <tr key={req.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{req.request_number}</td>
                <td className="px-4 py-3 text-gray-600">{req.request_date}</td>
                <td className="px-4 py-3">{req.requested_by}</td>
                <td className="px-4 py-3 text-gray-600">{req.department}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{req.item_name}</div>
                  <div className="text-xs text-gray-500">{req.item_name_ar}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(req.priority)}`}>
                    {req.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-bold">{fmt(req.estimated_total_price)} IQD</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(req.status)}`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => setViewRequest(req)} className="p-1.5 hover:bg-gray-100 rounded" title="View"><Eye size={14} /></button>
                    <button onClick={() => openApprovalModal(req, 'APPROVED')} className="p-1.5 hover:bg-green-50 rounded text-green-600" title="Approve"><CheckCircle size={14} /></button>
                    <button onClick={() => openApprovalModal(req, 'DECLINED')} className="p-1.5 hover:bg-red-50 rounded text-red-600" title="Decline"><XCircle size={14} /></button>
                    <button onClick={() => openApprovalModal(req, 'MORE_INFO_NEEDED')} className="p-1.5 hover:bg-blue-50 rounded text-blue-600" title="Request Info"><AlertCircle size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">No purchase requests found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* View Request Modal */}
      {viewRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewRequest(null)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-red-600">{viewRequest.request_number}</h2>
                <p className="text-sm text-gray-500">{viewRequest.request_date}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(viewRequest.status)}`}>
                {viewRequest.status}
              </span>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 block text-xs mb-1">Requested By</span><span className="font-medium">{viewRequest.requested_by}</span></div>
                <div><span className="text-gray-500 block text-xs mb-1">Department</span><span className="font-medium">{viewRequest.department}</span></div>
                <div><span className="text-gray-500 block text-xs mb-1">Priority</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(viewRequest.priority)}`}>{viewRequest.priority}</span></div>
                <div><span className="text-gray-500 block text-xs mb-1">Required By</span><span className="font-medium">{viewRequest.required_by_date || '-'}</span></div>
              </div>
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-2">Item Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                  <div><span className="text-gray-600">Item:</span> <span className="font-medium">{viewRequest.item_name}</span></div>
                  <div><span className="text-gray-600">Arabic:</span> <span className="font-medium">{viewRequest.item_name_ar}</span></div>
                  {viewRequest.item_description && <div><span className="text-gray-600">Description:</span> <span>{viewRequest.item_description}</span></div>}
                  <div><span className="text-gray-600">Category:</span> <span>{viewRequest.category}</span></div>
                  <div><span className="text-gray-600">Quantity:</span> <span className="font-medium">{viewRequest.quantity} {viewRequest.unit}</span></div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">Estimated Total:</span>
                    <span className="font-bold text-lg">{fmt(viewRequest.estimated_total_price)} IQD</span>
                  </div>
                </div>
              </div>
              {viewRequest.justification && (
                <div><span className="text-gray-500 block text-xs mb-1">Justification</span><p className="text-sm">{viewRequest.justification}</p></div>
              )}
              {viewRequest.preferred_supplier && (
                <div><span className="text-gray-500 block text-xs mb-1">Preferred Supplier</span><span className="text-sm font-medium">{viewRequest.preferred_supplier}</span></div>
              )}
              {viewRequest.reviewed_by && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-sm mb-2">Review Information</h3>
                  <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                    <div><span className="text-gray-600">Reviewed By:</span> <span className="font-medium">{viewRequest.reviewed_by}</span></div>
                    <div><span className="text-gray-600">Reviewed At:</span> <span>{new Date(viewRequest.reviewed_at).toLocaleString()}</span></div>
                    {viewRequest.approval_comments && <div><span className="text-gray-600">Comments:</span> <span>{viewRequest.approval_comments}</span></div>}
                    {viewRequest.decline_reason && <div className="text-red-600"><span className="font-medium">Decline Reason:</span> <span>{viewRequest.decline_reason}</span></div>}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2 justify-end flex-wrap">
              <button onClick={() => { setViewRequest(null); openApprovalModal(viewRequest, 'APPROVED'); }} className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><CheckCircle size={14} /> Approve</button>
              <button onClick={() => { setViewRequest(null); openApprovalModal(viewRequest, 'DECLINED'); }} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><XCircle size={14} /> Decline</button>
              <button onClick={() => { setViewRequest(null); openApprovalModal(viewRequest, 'MORE_INFO_NEEDED'); }} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><AlertCircle size={14} /> Request Info</button>
              <button onClick={() => setViewRequest(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Action Modal */}
      {showApprovalModal && approvingRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowApprovalModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold flex items-center gap-2">
                {approvalAction === 'APPROVED' && <><CheckCircle className="w-5 h-5 text-green-600" /> Approve Request</>}
                {approvalAction === 'DECLINED' && <><XCircle className="w-5 h-5 text-red-600" /> Decline Request</>}
                {approvalAction === 'MORE_INFO_NEEDED' && <><AlertCircle className="w-5 h-5 text-blue-600" /> Request More Information</>}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Request: <span className="font-mono font-medium">{approvingRequest.request_number}</span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Item: <span className="font-medium">{approvingRequest.item_name}</span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Requested By:</span>
                  <span className="font-medium">{approvingRequest.requested_by}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium">{approvingRequest.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">{fmt(approvingRequest.estimated_total_price)} IQD</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Current Status:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(approvingRequest.status)}`}>
                    {approvingRequest.status}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Your Name (Finance Employee) *
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {approvalAction === 'APPROVED' && 'Approval Comments'}
                  {approvalAction === 'DECLINED' && 'Decline Reason *'}
                  {approvalAction === 'MORE_INFO_NEEDED' && 'Information Needed *'}
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm"
                  rows={4}
                  placeholder={
                    approvalAction === 'APPROVED' ? 'Optional approval comments...' :
                    approvalAction === 'DECLINED' ? 'Please provide reason for declining...' :
                    'Please specify what additional information is needed...'
                  }
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowApprovalModal(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button 
                onClick={handleApprovalAction} 
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white ${
                  approvalAction === 'APPROVED' ? 'bg-green-500' :
                  approvalAction === 'DECLINED' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}
              >
                {approvalAction === 'APPROVED' && <><CheckCircle size={14} /> Approve</>}
                {approvalAction === 'DECLINED' && <><XCircle size={14} /> Decline</>}
                {approvalAction === 'MORE_INFO_NEEDED' && <><AlertCircle size={14} /> Request Info</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
