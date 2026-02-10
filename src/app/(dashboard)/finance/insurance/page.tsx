'use client';

import { useEffect, useState, useMemo } from 'react';
import { Shield, Plus, Search, Edit, Trash2, Eye, X } from 'lucide-react';
import { financeStore } from '@/lib/financeStore';
import type { InsuranceProvider, PatientInsurance } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);
const typeLabel: Record<string, string> = { PRIVATE_INSURANCE: 'Private', GOVERNMENT: 'Government', MOH: 'Ministry of Health' };
const typeColor: Record<string, string> = { PRIVATE_INSURANCE: 'bg-blue-100 text-blue-700', GOVERNMENT: 'bg-emerald-100 text-emerald-700', MOH: 'bg-purple-100 text-purple-700' };

export default function InsurancePage() {
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [policies, setPolicies] = useState<PatientInsurance[]>([]);
  const [tab, setTab] = useState<'providers' | 'policies'>('providers');
  const [mounted, setMounted] = useState(false);
  const [viewProvider, setViewProvider] = useState<InsuranceProvider | null>(null);

  useEffect(() => { financeStore.initialize(); reload(); setMounted(true); }, []);
  const reload = () => { setProviders(financeStore.getInsuranceProviders()); setPolicies(financeStore.getPatientInsurances()); };

  const activeProviders = providers.filter(p => p.is_active);
  const activePolicies = policies.filter(p => p.status === 'ACTIVE');
  const totalBudget = providers.reduce((s, p) => s + (p.total_annual_budget || 0), 0);
  const totalUsed = policies.reduce((s, p) => s + p.coverage_amount_used, 0);

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance & Government Support</h1>
        <p className="text-gray-500 text-sm">Manage insurance providers and patient policies</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Providers', value: activeProviders.length, color: 'text-gray-900' },
          { label: 'Active Policies', value: activePolicies.length, color: 'text-gray-900' },
          { label: 'Total Annual Budget', value: `${fmt(totalBudget)} IQD`, color: 'text-gray-900' },
          { label: 'Total Used', value: `${fmt(totalUsed)} IQD`, color: 'text-gray-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border p-4">
            <div className="text-xs text-gray-500">{k.label}</div>
            <div className={`text-lg font-bold ${k.color} mt-1`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('providers')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'providers' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Providers ({providers.length})</button>
        <button onClick={() => setTab('policies')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'policies' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>Patient Policies ({policies.length})</button>
      </div>

      {tab === 'providers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map(p => (
            <div key={p.provider_id} className="bg-white rounded-lg border p-4 hover:shadow-md transition cursor-pointer" onClick={() => setViewProvider(p)}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold">{p.provider_name_ar}</div>
                  {p.provider_name_en && <div className="text-xs text-gray-500">{p.provider_name_en}</div>}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColor[p.provider_type] || 'bg-gray-100 text-gray-700'}`}>{typeLabel[p.provider_type]}</span>
              </div>
              <div className="text-xs text-gray-400 mb-3">{p.provider_code}</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Phone:</span> {p.phone || '-'}</div>
                <div><span className="text-gray-500">Frequency:</span> {p.support_frequency || '-'}</div>
                {p.total_annual_budget && <div className="col-span-2"><span className="text-gray-500">Annual Budget:</span> <span className="font-medium">{fmt(p.total_annual_budget)} IQD</span></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'policies' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Policy #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Provider</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Coverage</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Limit (IQD)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Used (IQD)</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {policies.map(pi => {
                const provider = financeStore.getInsuranceProvider(pi.provider_id);
                const patient = financeStore.getPatient(pi.patient_id);
                return (
                  <tr key={pi.insurance_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{pi.policy_number}</td>
                    <td className="px-4 py-3">{patient?.full_name_ar || pi.patient_id}</td>
                    <td className="px-4 py-3">{provider?.provider_name_ar || pi.provider_id}</td>
                    <td className="px-4 py-3 text-center"><span className="font-medium">{pi.coverage_percentage}%</span> <span className="text-xs text-gray-400">({pi.coverage_type})</span></td>
                    <td className="px-4 py-3 text-right">{pi.coverage_amount_limit ? fmt(pi.coverage_amount_limit) : '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmt(pi.coverage_amount_used)}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pi.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{pi.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* View Provider Modal */}
      {viewProvider && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setViewProvider(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b"><h2 className="text-lg font-bold">{viewProvider.provider_name_ar}</h2><p className="text-xs text-gray-500">{viewProvider.provider_name_en}</p></div>
            <div className="p-6 grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 block text-xs">Type</span>{typeLabel[viewProvider.provider_type]}</div>
              <div><span className="text-gray-500 block text-xs">Code</span>{viewProvider.provider_code}</div>
              <div><span className="text-gray-500 block text-xs">Phone</span>{viewProvider.phone || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Email</span>{viewProvider.email || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Frequency</span>{viewProvider.support_frequency || '-'}</div>
              <div><span className="text-gray-500 block text-xs">Annual Budget</span><span className="font-bold">{viewProvider.total_annual_budget ? fmt(viewProvider.total_annual_budget) + ' IQD' : '-'}</span></div>
              {viewProvider.address_ar && <div className="col-span-2"><span className="text-gray-500 block text-xs">Address</span>{viewProvider.address_ar}</div>}
            </div>
            <div className="px-6 pb-6">
              <h3 className="font-semibold text-sm mb-2">Active Policies</h3>
              <div className="border rounded-lg divide-y text-sm max-h-40 overflow-y-auto">
                {policies.filter(pi => pi.provider_id === viewProvider.provider_id).map(pi => {
                  const patient = financeStore.getPatient(pi.patient_id);
                  return (
                    <div key={pi.insurance_id} className="p-3 flex justify-between">
                      <div><div className="font-medium">{patient?.full_name_ar || pi.patient_id}</div><div className="text-xs text-gray-500">{pi.policy_number}</div></div>
                      <div className="text-right"><div className="text-xs">{pi.coverage_percentage}% coverage</div><div className="text-xs text-gray-500">Used: {fmt(pi.coverage_amount_used)}</div></div>
                    </div>
                  );
                })}
                {policies.filter(pi => pi.provider_id === viewProvider.provider_id).length === 0 && <div className="p-3 text-center text-gray-400">No policies</div>}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end"><button onClick={() => setViewProvider(null)} className="px-4 py-2 border rounded-lg text-sm">Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
