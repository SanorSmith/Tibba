'use client';

import { useEffect, useState } from 'react';
import { Shield, Plus, Search, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface InsuranceCompany {
  id: string;
  company_code: string;
  company_name: string;
  company_name_ar?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  address_line1?: string;
  city?: string;
  province?: string;
  country?: string;
  default_discount_percentage?: number;
  default_copay_percentage?: number;
  claim_payment_terms_days?: number;
  contract_start_date?: string;
  contract_end_date?: string;
  coverage_limit?: number;
  is_active: boolean;
  notes?: string;
}

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);
const fmtM = (n: number) => `${(n / 1000000).toFixed(1)}M`;

export default function InsurancePage() {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<InsuranceCompany | null>(null);
  const [formData, setFormData] = useState<Partial<InsuranceCompany>>({});

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/insurance-companies');
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (error) {
      console.error('Failed to load insurance companies:', error);
      toast.error('Failed to load insurance companies');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setFormData({
      country: 'Iraq',
      is_active: true,
      default_discount_percentage: 0,
      default_copay_percentage: 0,
      claim_payment_terms_days: 30,
    });
    setShowModal(true);
  };

  const handleEdit = (company: InsuranceCompany) => {
    setEditingCompany(company);
    setFormData(company);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (!formData.company_code || !formData.company_name) {
        toast.error('Company code and name are required');
        return;
      }

      const url = editingCompany
        ? `/api/insurance-companies/${editingCompany.id}`
        : '/api/insurance-companies';
      const method = editingCompany ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(editingCompany ? 'Company updated' : 'Company created');
        setShowModal(false);
        loadCompanies();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save company');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save company');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deactivate this insurance company?')) return;

    try {
      const res = await fetch(`/api/insurance-companies/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Company deactivated');
        loadCompanies();
      } else {
        toast.error('Failed to deactivate company');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to deactivate company');
    }
  };

  const filteredCompanies = companies.filter(c => {
    if (activeOnly && !c.is_active) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.company_name.toLowerCase().includes(s) ||
        c.company_name_ar?.toLowerCase().includes(s) ||
        c.company_code.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const activeCompanies = companies.filter(c => c.is_active);
  const avgDiscount = activeCompanies.length
    ? activeCompanies.reduce((s, c) => s + (c.default_discount_percentage || 0), 0) / activeCompanies.length
    : 0;
  const avgCopay = activeCompanies.length
    ? activeCompanies.reduce((s, c) => s + (c.default_copay_percentage || 0), 0) / activeCompanies.length
    : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Insurance Companies</h1>
          <p className="text-gray-500 text-sm">Manage insurance providers and pricing</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Insurance Company
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={e => setActiveOnly(e.target.checked)}
            className="rounded"
          />
          Active only
        </label>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Total Companies</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{companies.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Active</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{activeCompanies.length}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Avg Discount</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{avgDiscount.toFixed(1)}%</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Avg Copay</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">{avgCopay.toFixed(1)}%</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Company Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Discount</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Copay</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Terms</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Coverage Limit</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCompanies.map(company => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{company.company_code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{company.company_name}</div>
                    {company.company_name_ar && (
                      <div className="text-xs text-gray-500">{company.company_name_ar}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">{company.contact_person || '-'}</div>
                    <div className="text-xs text-gray-500">{company.phone || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-blue-600">
                    {company.default_discount_percentage || 0}%
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-purple-600">
                    {company.default_copay_percentage || 0}%
                  </td>
                  <td className="px-4 py-3 text-center text-xs">
                    {company.claim_payment_terms_days || 30} days
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {company.coverage_limit ? `${fmtM(company.coverage_limit)} IQD` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        company.is_active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {company.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(company)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Deactivate"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCompanies.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No insurance companies found
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingCompany ? 'Edit Insurance Company' : 'Add Insurance Company'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Company Code *
                    </label>
                    <input
                      type="text"
                      value={formData.company_code || ''}
                      onChange={e => setFormData({ ...formData, company_code: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="INS-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.company_name || ''}
                      onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="National Insurance Co."
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Arabic Name
                    </label>
                    <input
                      type="text"
                      value={formData.company_name_ar || ''}
                      onChange={e => setFormData({ ...formData, company_name_ar: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="شركة التأمين الوطنية"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      value={formData.contact_person || ''}
                      onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone || ''}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={e => setFormData({ ...formData, website: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
                    <input
                      type="text"
                      value={formData.address_line1 || ''}
                      onChange={e => setFormData({ ...formData, address_line1: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
                    <input
                      type="text"
                      value={formData.province || ''}
                      onChange={e => setFormData({ ...formData, province: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Pricing Configuration</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.default_discount_percentage || 0}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          default_discount_percentage: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Copay %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.default_copay_percentage || 0}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          default_copay_percentage: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Payment Terms (days)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.claim_payment_terms_days || 30}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          claim_payment_terms_days: parseInt(e.target.value) || 30,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Contract */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Contract Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.contract_start_date || ''}
                      onChange={e =>
                        setFormData({ ...formData, contract_start_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.contract_end_date || ''}
                      onChange={e => setFormData({ ...formData, contract_end_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Coverage Limit (IQD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.coverage_limit || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          coverage_limit: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="50000000"
                    />
                  </div>
                </div>
              </div>

              {/* Notes & Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.is_active !== false}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  Active
                </label>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:opacity-90"
              >
                {editingCompany ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
