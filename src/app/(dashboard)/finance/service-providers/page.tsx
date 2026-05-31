'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChevronDown, ChevronUp, Plus, Trash2, Search,
  Users, DollarSign, RefreshCw, AlertCircle, X, CheckCircle2,
} from 'lucide-react';

/* ─── types ─────────────────────────────────────────────────────────── */
interface Service {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  price?: number;
  price_self_pay?: number;
  category?: string;
  active?: boolean;
}

interface Provider {
  id: string;
  stakeholder_id: string;
  stakeholder_name: string;
  stakeholder_name_en: string;
  stakeholder_role: string;
  provider_role: string;
  share_type: 'PERCENTAGE' | 'FIXED';
  share_percentage: string;
  share_amount: string;
  is_active: boolean;
}

interface Stakeholder {
  id: string;
  name_ar: string;
  name_en: string;
  role: string;
  mobile: string;
}

const fmt = (n: number | string) =>
  new Intl.NumberFormat('en-IQ').format(Math.round(parseFloat(String(n)) || 0));

/* ─── component ─────────────────────────────────────────────────────── */
export default function ServiceProvidersPage() {
  const [services, setServices]         = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState('');
  const [search, setSearch]             = useState('');
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);
  const [providers, setProviders]       = useState<Provider[]>([]);
  const [allocatedPct, setAllocatedPct] = useState(0);
  const [hospitalPct, setHospitalPct]   = useState(100);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Add-provider form
  const [showAddForm, setShowAddForm]   = useState(false);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [addForm, setAddForm] = useState({
    stakeholder_id: '',
    provider_role: 'DOCTOR',
    share_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    share_percentage: '',
    share_amount: '',
    notes: '',
  });
  const [adding, setAdding]       = useState(false);
  const [addError, setAddError]   = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  /* ── load services ── */
  useEffect(() => {
    setLoadingServices(true);
    fetch('/api/services')
      .then(r => r.json())
      .then(data => {
        // API returns array or { data: [] }
        const rows = Array.isArray(data) ? data : (data.data ?? []);
        setServices(rows);
      })
      .catch(e => setServicesError(e.message))
      .finally(() => setLoadingServices(false));
  }, []);

  /* ── load providers for a service ── */
  const loadProviders = useCallback(async (serviceId: string) => {
    setLoadingProviders(true);
    setProviders([]);
    try {
      const res = await fetch(`/api/services/${serviceId}/providers`);
      const data = await res.json();
      setProviders(data.data ?? []);
      setAllocatedPct(data.total_allocated_pct ?? 0);
      setHospitalPct(data.hospital_pct ?? 100);
    } catch {
      setProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  /* ── load stakeholders for add-form dropdown ── */
  const loadStakeholders = useCallback(async () => {
    if (stakeholders.length > 0) return; // cached
    try {
      const res = await fetch('/api/stakeholders?active=true&limit=100');
      const data = await res.json();
      setStakeholders(data.data ?? []);
    } catch {}
  }, [stakeholders.length]);

  /* ── toggle expanded service ── */
  const toggleService = async (svcId: string) => {
    if (expandedServiceId === svcId) {
      setExpandedServiceId(null);
      setShowAddForm(false);
      return;
    }
    setExpandedServiceId(svcId);
    setShowAddForm(false);
    setAddError('');
    setAddSuccess('');
    await loadProviders(svcId);
  };

  /* ── remove a provider ── */
  const removeProvider = async (serviceId: string, stakeholderId: string) => {
    if (!confirm('Remove this provider from the service?')) return;
    try {
      await fetch(`/api/services/${serviceId}/providers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stakeholder_id: stakeholderId }),
      });
      await loadProviders(serviceId);
    } catch (e: any) {
      alert(e.message);
    }
  };

  /* ── add a provider ── */
  const handleAdd = async (serviceId: string) => {
    setAdding(true);
    setAddError('');
    setAddSuccess('');
    try {
      const payload: any = {
        stakeholder_id: addForm.stakeholder_id,
        provider_role: addForm.provider_role,
        share_type: addForm.share_type,
        notes: addForm.notes || null,
      };
      if (addForm.share_type === 'PERCENTAGE') {
        payload.share_percentage = parseFloat(addForm.share_percentage) || 0;
      } else {
        payload.share_amount = parseFloat(addForm.share_amount) || 0;
      }

      const res = await fetch(`/api/services/${serviceId}/providers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to add provider');
      setAddSuccess('Provider added successfully');
      setAddForm({ stakeholder_id: '', provider_role: 'DOCTOR', share_type: 'PERCENTAGE', share_percentage: '', share_amount: '', notes: '' });
      setShowAddForm(false);
      await loadProviders(serviceId);
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setAdding(false);
    }
  };

  /* ── filtered services ── */
  const filtered = services.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.name_ar?.includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.category?.toLowerCase().includes(q)
    );
  });

  /* ─── render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Service Providers</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Configure which stakeholders receive a share when each service is billed on an invoice
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search services…"
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Error */}
      {servicesError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {servicesError}
        </div>
      )}

      {/* Services list */}
      {loadingServices ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-400 text-sm">
          Loading services…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-400 text-sm">
          No services found.
        </div>
      ) : (
        <div className="bg-white border rounded-lg divide-y overflow-hidden">
          {filtered.map(svc => {
            const isExpanded = expandedServiceId === svc.id;
            const price = svc.price ?? svc.price_self_pay ?? 0;
            return (
              <div key={svc.id}>
                {/* Service row */}
                <button
                  onClick={() => toggleService(svc.id)}
                  className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{svc.name}</span>
                      {svc.name_ar && (
                        <span className="text-sm text-gray-500">{svc.name_ar}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-mono">
                        {svc.code}
                      </span>
                    </div>
                    {svc.category && (
                      <p className="text-xs text-gray-400 mt-0.5">{svc.category}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-700">{fmt(price)} IQD</p>
                    <p className="text-xs text-gray-400">self-pay</p>
                  </div>
                  <div className="shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded: providers panel */}
                {isExpanded && (
                  <div className="bg-gray-50 border-t px-6 py-5 space-y-4">
                    {/* Allocation bar */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-blue-500 transition-all"
                          style={{ width: `${Math.min(allocatedPct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">
                        {allocatedPct.toFixed(1)}% allocated · {hospitalPct.toFixed(1)}% hospital
                      </span>
                    </div>

                    {loadingProviders ? (
                      <p className="text-sm text-gray-400 text-center py-4">Loading providers…</p>
                    ) : providers.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No providers configured. 100% goes to hospital.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-400 border-b">
                              <th className="text-left py-2 pr-4">Stakeholder</th>
                              <th className="text-left py-2 pr-4">Role</th>
                              <th className="text-left py-2 pr-4">Provider Role</th>
                              <th className="text-right py-2 pr-4">Share</th>
                              <th className="py-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {providers.map(p => (
                              <tr key={p.id} className="hover:bg-white">
                                <td className="py-2 pr-4">
                                  <span className="font-medium text-gray-800">{p.stakeholder_name}</span>
                                  {p.stakeholder_name_en && (
                                    <span className="text-gray-400 ml-1 text-xs">{p.stakeholder_name_en}</span>
                                  )}
                                </td>
                                <td className="py-2 pr-4 text-gray-500 text-xs">{p.stakeholder_role}</td>
                                <td className="py-2 pr-4">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs border border-blue-200">
                                    {p.provider_role}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-right font-semibold text-blue-700">
                                  {p.share_type === 'PERCENTAGE'
                                    ? `${parseFloat(p.share_percentage || '0').toFixed(1)}%`
                                    : `${fmt(p.share_amount)} IQD`}
                                </td>
                                <td className="py-2 text-right">
                                  <button
                                    onClick={() => removeProvider(svc.id, p.stakeholder_id)}
                                    className="text-red-400 hover:text-red-600 p-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Success message */}
                    {addSuccess && (
                      <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <CheckCircle2 className="w-4 h-4" /> {addSuccess}
                      </div>
                    )}

                    {/* Add provider form */}
                    {showAddForm ? (
                      <div className="bg-white border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-semibold text-gray-800">Add Provider</h4>
                          <button
                            onClick={() => { setShowAddForm(false); setAddError(''); }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">Stakeholder *</label>
                            <select
                              value={addForm.stakeholder_id}
                              onChange={e => setAddForm(f => ({ ...f, stakeholder_id: e.target.value }))}
                              onFocus={loadStakeholders}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select stakeholder…</option>
                              {stakeholders.map(s => (
                                <option key={s.id} value={s.id}>
                                  {s.name_ar} — {s.name_en} ({s.role})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Provider Role</label>
                            <select
                              value={addForm.provider_role}
                              onChange={e => setAddForm(f => ({ ...f, provider_role: e.target.value }))}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="DOCTOR">Doctor</option>
                              <option value="SPECIALIST">Specialist</option>
                              <option value="TECHNICIAN">Technician</option>
                              <option value="NURSE">Nurse</option>
                              <option value="LAB">Lab</option>
                              <option value="PHARMACY">Pharmacy</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 block mb-1">Share Type</label>
                            <select
                              value={addForm.share_type}
                              onChange={e => setAddForm(f => ({ ...f, share_type: e.target.value as 'PERCENTAGE' | 'FIXED' }))}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="PERCENTAGE">Percentage (%)</option>
                              <option value="FIXED">Fixed Amount</option>
                            </select>
                          </div>
                          {addForm.share_type === 'PERCENTAGE' ? (
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Percentage (0–100)</label>
                              <input
                                type="number"
                                min={0} max={100} step={0.5}
                                value={addForm.share_percentage}
                                onChange={e => setAddForm(f => ({ ...f, share_percentage: e.target.value }))}
                                placeholder="e.g. 30"
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="text-xs text-gray-500 block mb-1">Amount (IQD)</label>
                              <input
                                type="number"
                                min={0}
                                value={addForm.share_amount}
                                onChange={e => setAddForm(f => ({ ...f, share_amount: e.target.value }))}
                                placeholder="e.g. 5000"
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}
                          <div className="col-span-2">
                            <label className="text-xs text-gray-500 block mb-1">Notes</label>
                            <input
                              type="text"
                              value={addForm.notes}
                              onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Optional notes"
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        {addError && (
                          <div className="text-red-600 text-xs bg-red-50 border border-red-200 rounded px-3 py-2">
                            {addError}
                          </div>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setShowAddForm(false); setAddError(''); }}
                            className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAdd(svc.id)}
                            disabled={adding || !addForm.stakeholder_id}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 font-medium"
                          >
                            {adding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            {adding ? 'Adding…' : 'Add Provider'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setShowAddForm(true); setAddSuccess(''); loadStakeholders(); }}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add Provider to this Service
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
