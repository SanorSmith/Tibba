'use client';

import { useEffect, useState } from 'react';
import { Users, Plus, Search, Eye, Edit, Trash2, Building2, User, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

interface Shareholder {
  id: string;
  shareholder_id: string;
  full_name: string;
  full_name_ar: string;
  email: string;
  phone: string;
  mobile: string;
  address: string;
  address_ar: string;
  city: string;
  country: string;
  national_id: string;
  passport_number: string;
  date_of_birth: string;
  nationality: string;
  share_percentage: number;
  number_of_shares: number;
  share_value: number;
  investment_amount: number;
  investment_date: string;
  shareholder_type: string;
  company_name: string;
  company_registration: string;
  status: string;
  is_board_member: boolean;
  board_position: string;
  total_dividends_received: number;
  last_dividend_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export default function ShareholdersPage() {
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingShareholder, setEditingShareholder] = useState<Shareholder | null>(null);
  const [viewingShareholder, setViewingShareholder] = useState<Shareholder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const [formData, setFormData] = useState({
    shareholder_id: '',
    full_name: '',
    full_name_ar: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    address_ar: '',
    city: '',
    country: 'Iraq',
    national_id: '',
    passport_number: '',
    date_of_birth: '',
    nationality: 'Iraqi',
    share_percentage: 0,
    number_of_shares: 0,
    share_value: 0,
    investment_amount: 0,
    investment_date: '',
    shareholder_type: 'INDIVIDUAL',
    company_name: '',
    company_registration: '',
    status: 'ACTIVE',
    is_board_member: false,
    board_position: '',
    notes: '',
  });

  useEffect(() => {
    loadShareholders();
    setMounted(true);
  }, []);

  const loadShareholders = async () => {
    try {
      const res = await fetch('/api/shareholders');
      if (res.ok) {
        const data = await res.json();
        setShareholders(data);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast.error('Failed to load shareholders');
    }
  };

  const handleCreate = async () => {
    if (!formData.shareholder_id || !formData.full_name || formData.share_percentage <= 0) {
      toast.error('Fill required fields');
      return;
    }

    try {
      const res = await fetch('/api/shareholders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success('Shareholder created');
        loadShareholders();
        setShowCreate(false);
        resetForm();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create shareholder');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create shareholder');
    }
  };

  const handleEdit = async () => {
    if (!editingShareholder) return;

    try {
      const res = await fetch(`/api/shareholders/${editingShareholder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingShareholder),
      });

      if (res.ok) {
        toast.success('Shareholder updated');
        loadShareholders();
        setShowEdit(false);
        setEditingShareholder(null);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update shareholder');
      }
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to update shareholder');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/shareholders/${deleteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Shareholder deleted');
        loadShareholders();
        setDeleteId(null);
      } else {
        toast.error('Failed to delete shareholder');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete shareholder');
    }
  };

  const openEdit = (sh: Shareholder) => {
    setEditingShareholder({ ...sh });
    setShowEdit(true);
  };

  const openView = (sh: Shareholder) => {
    setViewingShareholder(sh);
    setShowView(true);
  };

  const resetForm = () => {
    setFormData({
      shareholder_id: '',
      full_name: '',
      full_name_ar: '',
      email: '',
      phone: '',
      mobile: '',
      address: '',
      address_ar: '',
      city: '',
      country: 'Iraq',
      national_id: '',
      passport_number: '',
      date_of_birth: '',
      nationality: 'Iraqi',
      share_percentage: 0,
      number_of_shares: 0,
      share_value: 0,
      investment_amount: 0,
      investment_date: '',
      shareholder_type: 'INDIVIDUAL',
      company_name: '',
      company_registration: '',
      status: 'ACTIVE',
      is_board_member: false,
      board_position: '',
      notes: '',
    });
  };

  const filteredShareholders = shareholders.filter(sh => {
    const matchesSearch = !searchQuery || 
      sh.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sh.full_name_ar?.includes(searchQuery) ||
      sh.shareholder_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sh.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = !filterStatus || sh.status === filterStatus;
    const matchesType = !filterType || sh.shareholder_type === filterType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalShares = shareholders.reduce((sum, sh) => sum + sh.number_of_shares, 0);
  const totalInvestment = shareholders.reduce((sum, sh) => sum + sh.investment_amount, 0);
  const totalDividends = shareholders.reduce((sum, sh) => sum + sh.total_dividends_received, 0);
  const boardMembers = shareholders.filter(sh => sh.is_board_member).length;

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-700';
      case 'INACTIVE': return 'bg-gray-100 text-gray-700';
      case 'SUSPENDED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'INDIVIDUAL': return <User size={14} />;
      case 'CORPORATE': return <Building2 size={14} />;
      case 'INSTITUTIONAL': return <TrendingUp size={14} />;
      default: return <User size={14} />;
    }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shareholders</h1>
          <p className="text-gray-500 text-sm">Manage hospital shareholders and ownership</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)} 
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-blue-600 w-fit"
        >
          <Plus size={16} /> Add Shareholder
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Total Shareholders</div>
          <div className="text-2xl font-bold text-gray-900">{shareholders.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Total Shares</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(totalShares)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Total Investment</div>
          <div className="text-2xl font-bold text-gray-900">{fmt(totalInvestment)} IQD</div>
        </div>
        <div className="bg-white rounded-xl p-4 border">
          <div className="text-xs text-gray-500 mb-1">Board Members</div>
          <div className="text-2xl font-bold text-gray-900">{boardMembers}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search shareholders..."
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
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="CORPORATE">Corporate</option>
            <option value="INSTITUTIONAL">Institutional</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">ID</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Shares %</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Investment</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Board</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Status</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredShareholders.map(sh => (
              <tr key={sh.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{sh.shareholder_id}</td>
                <td className="px-4 py-3">
                  <div className="font-medium">{sh.full_name}</div>
                  <div className="text-xs text-gray-500">{sh.full_name_ar}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {typeIcon(sh.shareholder_type)}
                    <span className="text-xs">{sh.shareholder_type}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-bold">{sh.share_percentage}%</td>
                <td className="px-4 py-3 text-right">{fmt(sh.investment_amount)} IQD</td>
                <td className="px-4 py-3 text-center">
                  {sh.is_board_member ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                      {sh.board_position || 'Member'}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(sh.status)}`}>
                    {sh.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openView(sh)} className="p-1.5 hover:bg-gray-100 rounded" title="View"><Eye size={14} /></button>
                    <button onClick={() => openEdit(sh)} className="p-1.5 hover:bg-gray-100 rounded" title="Edit"><Edit size={14} /></button>
                    <button onClick={() => setDeleteId(sh.id)} className="p-1.5 hover:bg-red-50 rounded text-red-500" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredShareholders.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-400">No shareholders found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-red-600">Add New Shareholder</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Shareholder ID *</label>
                  <input
                    value={formData.shareholder_id}
                    onChange={e => setFormData({...formData, shareholder_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="SH-001"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Type</label>
                  <select
                    value={formData.shareholder_type}
                    onChange={e => setFormData({...formData, shareholder_type: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="CORPORATE">Corporate</option>
                    <option value="INSTITUTIONAL">Institutional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full Name *</label>
                  <input
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full Name (Arabic)</label>
                  <input
                    value={formData.full_name_ar}
                    onChange={e => setFormData({...formData, full_name_ar: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    dir="rtl"
                  />
                </div>
              </div>

              {formData.shareholder_type === 'CORPORATE' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Company Name</label>
                    <input
                      value={formData.company_name}
                      onChange={e => setFormData({...formData, company_name: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Company Registration</label>
                    <input
                      value={formData.company_registration}
                      onChange={e => setFormData({...formData, company_registration: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Phone</label>
                  <input
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Mobile</label>
                  <input
                    value={formData.mobile}
                    onChange={e => setFormData({...formData, mobile: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Share % *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.share_percentage}
                    onChange={e => setFormData({...formData, share_percentage: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Number of Shares</label>
                  <input
                    type="number"
                    value={formData.number_of_shares}
                    onChange={e => setFormData({...formData, number_of_shares: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Share Value (IQD)</label>
                  <input
                    type="number"
                    value={formData.share_value}
                    onChange={e => setFormData({...formData, share_value: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Investment (IQD)</label>
                  <input
                    type="number"
                    value={formData.investment_amount}
                    onChange={e => setFormData({...formData, investment_amount: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Investment Date</label>
                  <input
                    type="date"
                    value={formData.investment_date}
                    onChange={e => setFormData({...formData, investment_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_board_member}
                    onChange={e => setFormData({...formData, is_board_member: e.target.checked})}
                    className="rounded"
                  />
                  <label className="text-sm">Board Member</label>
                </div>
                {formData.is_board_member && (
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Board Position</label>
                    <input
                      value={formData.board_position}
                      onChange={e => setFormData({...formData, board_position: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="Chairman, Member, etc."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Create Shareholder</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Similar structure to Create */}
      {showEdit && editingShareholder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-red-600">Edit Shareholder</h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full Name *</label>
                  <input
                    value={editingShareholder.full_name}
                    onChange={e => setEditingShareholder({...editingShareholder, full_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full Name (Arabic)</label>
                  <input
                    value={editingShareholder.full_name_ar}
                    onChange={e => setEditingShareholder({...editingShareholder, full_name_ar: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    dir="rtl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Share % *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingShareholder.share_percentage}
                    onChange={e => setEditingShareholder({...editingShareholder, share_percentage: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Number of Shares</label>
                  <input
                    type="number"
                    value={editingShareholder.number_of_shares}
                    onChange={e => setEditingShareholder({...editingShareholder, number_of_shares: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Share Value (IQD)</label>
                  <input
                    type="number"
                    value={editingShareholder.share_value}
                    onChange={e => setEditingShareholder({...editingShareholder, share_value: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Investment (IQD)</label>
                  <input
                    type="number"
                    value={editingShareholder.investment_amount}
                    onChange={e => setEditingShareholder({...editingShareholder, investment_amount: Number(e.target.value)})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  <select
                    value={editingShareholder.status}
                    onChange={e => setEditingShareholder({...editingShareholder, status: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingShareholder.is_board_member}
                    onChange={e => setEditingShareholder({...editingShareholder, is_board_member: e.target.checked})}
                    className="rounded"
                  />
                  <label className="text-sm">Board Member</label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowEdit(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleEdit} className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && viewingShareholder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowView(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-red-600">{viewingShareholder.full_name}</h2>
              <p className="text-sm text-gray-500">{viewingShareholder.full_name_ar}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 block text-xs">Shareholder ID</span><span className="font-mono">{viewingShareholder.shareholder_id}</span></div>
                <div><span className="text-gray-500 block text-xs">Type</span>{viewingShareholder.shareholder_type}</div>
                <div><span className="text-gray-500 block text-xs">Share Percentage</span><span className="font-bold">{viewingShareholder.share_percentage}%</span></div>
                <div><span className="text-gray-500 block text-xs">Number of Shares</span>{fmt(viewingShareholder.number_of_shares)}</div>
                <div><span className="text-gray-500 block text-xs">Investment Amount</span>{fmt(viewingShareholder.investment_amount)} IQD</div>
                <div><span className="text-gray-500 block text-xs">Investment Date</span>{viewingShareholder.investment_date}</div>
                {viewingShareholder.is_board_member && (
                  <div><span className="text-gray-500 block text-xs">Board Position</span><span className="font-medium">{viewingShareholder.board_position}</span></div>
                )}
                <div><span className="text-gray-500 block text-xs">Status</span><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(viewingShareholder.status)}`}>{viewingShareholder.status}</span></div>
              </div>
              {viewingShareholder.notes && (
                <div><span className="text-gray-500 block text-xs mb-1">Notes</span><p className="text-sm">{viewingShareholder.notes}</p></div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowView(false)} className="px-4 py-2 border rounded-lg text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">Delete Shareholder?</h3>
            <p className="text-sm text-gray-600 mb-4">This will permanently delete this shareholder record.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
