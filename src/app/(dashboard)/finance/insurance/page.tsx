'use client';

import { useEffect, useState } from 'react';
import { Shield, Plus, Search, Edit, Trash2, X, Users, CheckCircle2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import PatientSearchSelect from '@/components/PatientSearchSelect';

const fmtIQD = (n: any) => new Intl.NumberFormat('en-IQ').format(Math.round(parseFloat(String(n)) || 0));

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
  type: string;
  contact?: {
    contact_person?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  address?: {
    address_line1?: string;
    city?: string;
    province?: string;
    country?: string;
  };
  payment_terms?: number;
  credit_limit?: number;
  annual_budget?: number;
  active: boolean;
  metadata?: {
    default_discount_percentage?: number;
    default_copay_percentage?: number;
    claim_payment_terms_days?: number;
    contract_start_date?: string;
    contract_end_date?: string;
    coverage_limit?: number;
    notes?: string;
  };
  // Backward compatibility properties for UI
  company_id?: string;
  coverage_percentage?: number;
  company_code?: string;
  company_name?: string;
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
  is_active?: boolean;
  notes?: string;
}

// Helper function to map database data to UI format
const mapInsuranceData = (data: any): InsuranceCompany => ({
  id: data.id,
  // data.id IS the company_id (e.g. "INS-005"); carry it + real coverage % through
  company_id: data.id,
  coverage_percentage: data.coverage_percentage != null ? parseFloat(data.coverage_percentage) : undefined,
  code: data.code,
  name: data.name,
  name_ar: data.name_ar,
  type: data.type,
  contact: data.contact || {},
  address: data.address || {},
  payment_terms: data.payment_terms,
  credit_limit: data.credit_limit,
  annual_budget: data.annual_budget,
  active: data.active,
  metadata: data.metadata || {},
  // For backward compatibility with existing UI
  company_code: data.code,
  company_name: data.name,
  company_name_ar: data.name_ar,
  contact_person: data.contact?.contact_person,
  phone: data.contact?.phone,
  email: data.contact?.email,
  website: data.contact?.website,
  address_line1: data.address?.address_line1,
  city: data.address?.city,
  province: data.address?.province,
  country: data.address?.country,
  default_discount_percentage: data.metadata?.default_discount_percentage,
  default_copay_percentage: data.metadata?.default_copay_percentage,
  claim_payment_terms_days: data.metadata?.claim_payment_terms_days,
  contract_start_date: data.metadata?.contract_start_date,
  contract_end_date: data.metadata?.contract_end_date,
  coverage_limit: data.metadata?.coverage_limit,
  is_active: data.active,
  notes: data.metadata?.notes,
});

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

  // Tabs
  const [tab, setTab] = useState<'companies' | 'policies' | 'preapprovals'>('companies');

  // Patient policies (enrollment)
  const [policies, setPolicies] = useState<any[]>([]);
  const [showEnroll, setShowEnroll] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ patient_id: '', company_id: '', policy_number: '', policy_type: '', notes: '' });

  // Pre-approvals
  const [preApprovals, setPreApprovals] = useState<any[]>([]);
  const [showPaRequest, setShowPaRequest] = useState(false);
  const [paForm, setPaForm] = useState({ patient_id: '', company_id: '', cpt_codes: '', icd10_codes: '', authorized_amount: '', clinical_justification: '', requested_services: '' });
  const [paDecision, setPaDecision] = useState<{ row: any; action: 'approve' | 'deny' } | null>(null);
  const [paDecisionFields, setPaDecisionFields] = useState({ authorized_amount: '', expiration_date: '', denial_reason: '' });

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (tab === 'policies') loadPolicies();
    if (tab === 'preapprovals') loadPreApprovals();
  }, [tab]);

  const loadPolicies = async () => {
    try {
      const d = await fetch('/api/patient-insurance').then(r => r.json());
      setPolicies(d.data ?? []);
    } catch { setPolicies([]); }
  };

  const loadPreApprovals = async () => {
    try {
      const d = await fetch('/api/insurance-pre-approvals').then(r => r.json());
      setPreApprovals(d.data ?? []);
    } catch { setPreApprovals([]); }
  };

  const submitPaRequest = async () => {
    if (!paForm.patient_id) { toast.error('Select a patient'); return; }
    try {
      const res = await fetch('/api/insurance-pre-approvals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...paForm, authorized_amount: parseFloat(paForm.authorized_amount) || 0 }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(`Pre-approval ${data.data.authorization_number} requested`);
      setShowPaRequest(false);
      setPaForm({ patient_id: '', company_id: '', cpt_codes: '', icd10_codes: '', authorized_amount: '', clinical_justification: '', requested_services: '' });
      loadPreApprovals();
    } catch (e: any) { toast.error(e.message); }
  };

  // Build the pre-approval request document body (shared by PDF + email)
  const paDocLines = (pa: any) => {
    const cpt = Array.isArray(pa.cpt_codes) ? pa.cpt_codes.join(', ') : (pa.cpt_codes || '—');
    const icd = Array.isArray(pa.icd10_codes) ? pa.icd10_codes.join(', ') : (pa.icd10_codes || '—');
    const service = pa.requested_services?.description || pa.requested_services || '—';
    return { cpt, icd, service };
  };

  const printPaRequest = (pa: any) => {
    const { cpt, icd, service } = paDocLines(pa);
    const today = new Date().toLocaleDateString('en-GB');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Pre-Approval Request ${pa.authorization_number}</title>
      <style>
        body{font-family:Arial,Helvetica,sans-serif;color:#111;padding:36px;max-width:760px;margin:auto;font-size:13px}
        h1{font-size:20px;margin:0}
        .muted{color:#777}
        .head{display:flex;justify-content:space-between;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:18px}
        table{width:100%;border-collapse:collapse;margin:10px 0}
        td{padding:6px 8px;border:1px solid #e2e2e2;vertical-align:top}
        td.l{background:#f7f7f7;font-weight:bold;width:200px}
        .sec{margin-top:20px}
        .sec h3{font-size:14px;border-bottom:1px solid #ddd;padding-bottom:5px;margin-bottom:6px}
        .sign{margin-top:48px;display:flex;justify-content:space-between}
        .sign div{width:45%;border-top:1px solid #999;padding-top:6px;font-size:12px;color:#555}
        @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
      </style></head><body>
      <div class="head">
        <div><h1>Insurance Pre-Approval Request</h1><div class="muted">Tibbna Hospital — Prior Authorization</div></div>
        <div style="text-align:right"><div><strong>${pa.authorization_number}</strong></div><div class="muted">Date: ${pa.request_date ? new Date(pa.request_date).toLocaleDateString('en-GB') : today}</div></div>
      </div>

      <div class="sec"><h3>To (Insurer)</h3><table>
        <tr><td class="l">Insurance Company</td><td>${pa.company_name || '—'}</td></tr>
        <tr><td class="l">Contact Email</td><td>${pa.company_email || '—'}</td></tr>
        <tr><td class="l">Contact Phone</td><td>${pa.company_phone || '—'}</td></tr>
      </table></div>

      <div class="sec"><h3>Patient</h3><table>
        <tr><td class="l">Patient Name</td><td>${pa.patient_name || '—'}</td></tr>
        <tr><td class="l">National ID</td><td>${pa.patient_national_id || '—'}</td></tr>
        <tr><td class="l">Phone</td><td>${pa.patient_phone || '—'}</td></tr>
      </table></div>

      <div class="sec"><h3>Requested Procedure</h3><table>
        <tr><td class="l">Service</td><td>${service}</td></tr>
        <tr><td class="l">CPT Code(s)</td><td>${cpt}</td></tr>
        <tr><td class="l">ICD-10 Diagnosis</td><td>${icd}</td></tr>
        <tr><td class="l">Estimated Cost</td><td><strong>${fmtIQD(pa.authorized_amount)} IQD</strong></td></tr>
      </table></div>

      <div class="sec"><h3>Clinical Justification</h3>
        <p style="border:1px solid #e2e2e2;padding:10px;border-radius:4px;min-height:50px">${pa.clinical_justification || '—'}</p>
      </div>

      <p class="muted" style="margin-top:18px">We request prior authorization for the above procedure. Please confirm coverage, authorized amount, and authorization expiry.</p>

      <div class="sign">
        <div>Requested by (Hospital)</div>
        <div>Insurer Approval / Signature</div>
      </div>
      <script>window.onload=function(){window.print();}</script>
    </body></html>`;
    const w = window.open('', '_blank', 'width=820,height=920');
    if (!w) { toast.error('Allow pop-ups to print the request'); return; }
    w.document.write(html); w.document.close();
  };

  const emailPaRequest = (pa: any) => {
    const { cpt, icd, service } = paDocLines(pa);
    const to = pa.company_email || '';
    if (!to) { toast.error('No email on file for this insurer — add it in Companies'); return; }
    const NL = String.fromCharCode(10);
    const body = [
      `Dear ${pa.company_name || 'Insurer'},`, ``,
      `Tibbna Hospital requests PRIOR AUTHORIZATION for the following procedure:`, ``,
      `Authorization Ref: ${pa.authorization_number}`,
      `Patient: ${pa.patient_name || '—'}  (National ID: ${pa.patient_national_id || '—'})`,
      `Service: ${service}`,
      `CPT Code(s): ${cpt}`,
      `ICD-10 Diagnosis: ${icd}`,
      `Estimated Cost: ${fmtIQD(pa.authorized_amount)} IQD`, ``,
      `Clinical Justification:`, `${pa.clinical_justification || '—'}`, ``,
      `Please confirm coverage, the authorized amount, and the authorization expiry date.`, ``,
      `Regards,`, `Tibbna Hospital — Finance / Insurance Desk`,
    ].join(NL);
    const subject = `Pre-Approval Request ${pa.authorization_number} — ${pa.patient_name || 'Patient'}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const submitPaDecision = async () => {
    if (!paDecision) return;
    try {
      const body: any = { action: paDecision.action };
      if (paDecision.action === 'approve') {
        body.authorized_amount = parseFloat(paDecisionFields.authorized_amount) || paDecision.row.authorized_amount || 0;
        body.expiration_date = paDecisionFields.expiration_date || null;
      } else {
        body.denial_reason = paDecisionFields.denial_reason || 'Not specified';
      }
      const res = await fetch(`/api/insurance-pre-approvals/${paDecision.row.preapprovalid}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success(`Pre-approval marked ${paDecision.action === 'approve' ? 'APPROVED' : 'REJECTED'} by insurer`);
      setPaDecision(null);
      setPaDecisionFields({ authorized_amount: '', expiration_date: '', denial_reason: '' });
      loadPreApprovals();
    } catch (e: any) { toast.error(e.message); }
  };

  const enrollPolicy = async () => {
    if (!enrollForm.patient_id || !enrollForm.company_id) { toast.error('Patient ID and company are required'); return; }
    try {
      const res = await fetch('/api/patient-insurance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enrollForm),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success('Patient enrolled in insurance policy');
      setShowEnroll(false);
      setEnrollForm({ patient_id: '', company_id: '', policy_number: '', policy_type: '', notes: '' });
      loadPolicies();
    } catch (e: any) { toast.error(e.message); }
  };

  const deletePolicy = async (id: string) => {
    if (!confirm('Remove this patient policy?')) return;
    try {
      await fetch(`/api/patient-insurance/${id}`, { method: 'DELETE' });
      loadPolicies();
    } catch { toast.error('Failed to delete'); }
  };


  const loadCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/insurance-companies');
      if (res.ok) {
        const data = await res.json();
        const mappedData = data.map(mapInsuranceData);
        setCompanies(mappedData);
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
      type: 'PRIVATE',
      active: true,
      payment_terms: 30,
      credit_limit: 0,
      annual_budget: 0,
      address: {
        country: 'Iraq'
      },
      metadata: {
        default_discount_percentage: 0,
        default_copay_percentage: 0,
        claim_payment_terms_days: 30
      }
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
      if (!formData.code || !formData.name) {
        toast.error('Company code and name are required');
        return;
      }

      const url = editingCompany
        ? `/api/insurance-companies/${editingCompany.id}`
        : '/api/insurance-companies';
      const method = editingCompany ? 'PUT' : 'POST';

      // Transform form data to match API expectations
      const apiData = {
        code: formData.code,
        name: formData.name,
        name_ar: formData.name_ar,
        type: formData.type || 'PRIVATE',
        contact: formData.contact || {},
        address: formData.address || {},
        payment_terms: formData.payment_terms || 30,
        credit_limit: formData.credit_limit || 0,
        annual_budget: formData.annual_budget || 0,
        active: formData.active !== false,
        metadata: {
          default_discount_percentage: formData.metadata?.default_discount_percentage || 0,
          default_copay_percentage: formData.metadata?.default_copay_percentage || 0,
          claim_payment_terms_days: formData.metadata?.claim_payment_terms_days || 30,
          contract_start_date: formData.metadata?.contract_start_date || null,
          contract_end_date: formData.metadata?.contract_end_date || null,
          coverage_limit: formData.metadata?.coverage_limit || null,
          notes: formData.metadata?.notes || null
        }
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
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
    if (activeOnly && !c.active) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(s) ||
        c.name_ar?.toLowerCase().includes(s) ||
        c.code.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const activeCompanies = companies.filter(c => c.active);
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
        {tab === 'companies' && (
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Insurance Company
          </button>
        )}
        {tab === 'policies' && (
          <button onClick={() => setShowEnroll(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Enroll Patient
          </button>
        )}
        {tab === 'preapprovals' && (
          <button onClick={() => setShowPaRequest(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Request Pre-Approval
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {[
          { key: 'companies', label: 'Companies', icon: Shield },
          { key: 'policies', label: 'Patient Policies', icon: Users },
          { key: 'preapprovals', label: 'Pre-Approvals', icon: ClipboardCheck },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${
                tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── COMPANIES TAB ── */}
      {tab === 'companies' && (<>
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
                  <td className="px-4 py-3 font-mono text-xs">{company.code}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{company.name}</div>
                    {company.name_ar && (
                      <div className="text-xs text-gray-500">{company.name_ar}</div>
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
                        company.active
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {company.active ? 'Active' : 'Inactive'}
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
      </>)}

      {/* ── PATIENT POLICIES TAB ── */}
      {tab === 'policies' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">
            Patient Insurance Policies ({policies.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Patient ID', 'Company', 'Policy #', 'Coverage %', 'Type', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2 font-medium text-gray-600 text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {policies.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{p.patient_id?.slice(0, 8)}…</td>
                    <td className="px-4 py-2 font-medium">{p.company_name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{p.policy_number || '—'}</td>
                    <td className="px-4 py-2 text-right">{p.coverage_percentage != null ? `${p.coverage_percentage}%` : '—'}</td>
                    <td className="px-4 py-2 text-gray-500">{p.policy_type || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => deletePolicy(p.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
                {policies.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No patient policies. Click "Enroll Patient" to add one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PRE-APPROVALS TAB ── */}
      {tab === 'preapprovals' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">
            Insurance Pre-Approvals ({preApprovals.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>{['Auth #', 'Patient', 'Company', 'Amount', 'Status', 'Date', 'Insurer Decision'].map(h => (
                  <th key={h} className="text-left px-4 py-2 font-medium text-gray-600 text-xs">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y">
                {preApprovals.map(pa => (
                  <tr key={pa.preapprovalid} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{pa.authorization_number}</td>
                    <td className="px-4 py-2 font-mono text-xs">{String(pa.patientid).slice(0, 8)}…</td>
                    <td className="px-4 py-2">{pa.company_name || '—'}</td>
                    <td className="px-4 py-2 text-right">{fmtIQD(pa.authorized_amount)} IQD</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        pa.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                        pa.status === 'DENIED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>{pa.status}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{pa.request_date ? new Date(pa.request_date).toLocaleDateString('en-GB') : '—'}</td>
                    <td className="px-4 py-2">
                      <div className="flex gap-1 flex-wrap items-center">
                        {/* Send request to insurer — available for any status */}
                        <button onClick={() => printPaRequest(pa)} title="Print / Save PDF request"
                          className="px-2 py-1 border rounded text-xs hover:bg-gray-50 text-gray-700">🖨 PDF</button>
                        <button onClick={() => emailPaRequest(pa)} title="Email request to insurer"
                          className="px-2 py-1 border rounded text-xs hover:bg-blue-50 text-blue-600">✉ Email</button>
                        {pa.status === 'PENDING' ? (
                          <>
                            <button onClick={() => { setPaDecision({ row: pa, action: 'approve' }); setPaDecisionFields({ authorized_amount: String(pa.authorized_amount || ''), expiration_date: '', denial_reason: '' }); }}
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700">Mark Approved</button>
                            <button onClick={() => { setPaDecision({ row: pa, action: 'deny' }); setPaDecisionFields({ authorized_amount: '', expiration_date: '', denial_reason: '' }); }}
                              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600">Mark Rejected</button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">
                            {pa.status === 'APPROVED' ? `✓ Approved${pa.response_date ? ' ' + new Date(pa.response_date).toLocaleDateString('en-GB') : ''}` : `✕ ${pa.denial_reason || 'Rejected'}`}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {preApprovals.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No pre-approval requests yet. Click "Request Pre-Approval" to create one.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Request Pre-Approval Modal */}
      {showPaRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaRequest(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Request Pre-Approval</h3>
                <p className="text-xs text-gray-500 mt-0.5">Prior authorization for an expensive procedure (before service)</p>
              </div>
              <button onClick={() => setShowPaRequest(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Patient *</label>
                <PatientSearchSelect onSelect={(p) => setPaForm(f => ({ ...f, patient_id: p?.id || '' }))} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Insurance Company</label>
                <select value={paForm.company_id} onChange={e => setPaForm(f => ({ ...f, company_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select company…</option>
                  {companies.map(c => (
                    <option key={c.company_id || c.id} value={c.company_id || c.id}>{c.company_name || c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">CPT Code(s)</label>
                  <input value={paForm.cpt_codes} onChange={e => setPaForm(f => ({ ...f, cpt_codes: e.target.value }))}
                    placeholder="e.g. 27447" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">ICD-10 Code(s)</label>
                  <input value={paForm.icd10_codes} onChange={e => setPaForm(f => ({ ...f, icd10_codes: e.target.value }))}
                    placeholder="e.g. M17.0" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Estimated Cost (IQD)</label>
                <input type="number" value={paForm.authorized_amount} onChange={e => setPaForm(f => ({ ...f, authorized_amount: e.target.value }))}
                  placeholder="e.g. 5000000" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Requested Service</label>
                <input value={paForm.requested_services} onChange={e => setPaForm(f => ({ ...f, requested_services: e.target.value }))}
                  placeholder="e.g. Total knee replacement" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Clinical Justification</label>
                <textarea rows={2} value={paForm.clinical_justification} onChange={e => setPaForm(f => ({ ...f, clinical_justification: e.target.value }))}
                  placeholder="Why the procedure is medically necessary" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowPaRequest(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={submitPaRequest} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 font-medium">Submit Request</button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-Approval Decision Modal (record insurer's answer) */}
      {paDecision && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPaDecision(null)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b">
              <h3 className="text-lg font-semibold">
                {paDecision.action === 'approve' ? 'Mark Approved by Insurer' : 'Mark Rejected by Insurer'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Record the insurance company's decision for {paDecision.row.authorization_number}</p>
            </div>
            <div className="p-5 space-y-3">
              {paDecision.action === 'approve' ? (
                <>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Authorized Amount (IQD)</label>
                    <input type="number" value={paDecisionFields.authorized_amount}
                      onChange={e => setPaDecisionFields(f => ({ ...f, authorized_amount: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Authorization Expiry Date</label>
                    <input type="date" value={paDecisionFields.expiration_date}
                      onChange={e => setPaDecisionFields(f => ({ ...f, expiration_date: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Denial Reason</label>
                  <textarea rows={3} value={paDecisionFields.denial_reason}
                    onChange={e => setPaDecisionFields(f => ({ ...f, denial_reason: e.target.value }))}
                    placeholder="Reason the insurer gave for rejecting" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setPaDecision(null)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={submitPaDecision}
                className={`px-4 py-2 text-white rounded-lg text-sm font-medium ${paDecision.action === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {paDecision.action === 'approve' ? 'Confirm Approved' : 'Confirm Rejected'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Patient Modal */}
      {showEnroll && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEnroll(false)}>
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold">Enroll Patient in Insurance</h3>
              <button onClick={() => setShowEnroll(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Patient *</label>
                <PatientSearchSelect
                  onSelect={(p) => setEnrollForm(f => ({ ...f, patient_id: p?.id || '' }))}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Insurance Company *</label>
                <select value={enrollForm.company_id} onChange={e => setEnrollForm(f => ({ ...f, company_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <option value="">Select company…</option>
                  {companies.map((c) => (
                    <option key={c.company_id || c.id} value={c.company_id || c.id}>
                      {c.company_name || c.name} — {c.coverage_percentage != null ? `${c.coverage_percentage}% coverage` : 'no coverage set'}
                    </option>
                  ))}
                </select>
                {/* Show selected company's coverage as confirmation */}
                {enrollForm.company_id && (() => {
                  const sel = companies.find(c => (c.company_id || c.id) === enrollForm.company_id);
                  return sel ? (
                    <p className="text-[11px] text-emerald-600 mt-1">
                      Coverage: <strong>{sel.coverage_percentage ?? 0}%</strong> — insurance pays {sel.coverage_percentage ?? 0}% of billed services.
                    </p>
                  ) : null;
                })()}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Policy Number</label>
                  <input value={enrollForm.policy_number} onChange={e => setEnrollForm(f => ({ ...f, policy_number: e.target.value }))}
                    placeholder="Member / policy #" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Policy Type</label>
                  <select value={enrollForm.policy_type} onChange={e => setEnrollForm(f => ({ ...f, policy_type: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">Select type…</option>
                    {['Individual', 'Family', 'Corporate', 'Government', 'Premium', 'Basic', 'VIP'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button onClick={() => setShowEnroll(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={enrollPolicy} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 font-medium">Enroll</button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
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
                      value={formData.code || ''}
                      onChange={e => setFormData({ ...formData, code: e.target.value })}
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
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
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
                      value={formData.name_ar || ''}
                      onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
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
                      value={formData.contact?.contact_person || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        contact: { ...formData.contact, contact_person: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.contact?.phone || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        contact: { ...formData.contact, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.contact?.email || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        contact: { ...formData.contact, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="text"
                      value={formData.contact?.website || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        contact: { ...formData.contact, website: e.target.value }
                      })}
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
                      value={formData.address?.address_line1 || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        address: { ...formData.address, address_line1: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.address?.city || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        address: { ...formData.address, city: e.target.value }
                      })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
                    <input
                      type="text"
                      value={formData.address?.province || ''}
                      onChange={e => setFormData({ 
                        ...formData, 
                        address: { ...formData.address, province: e.target.value }
                      })}
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
                      value={formData.metadata?.default_discount_percentage || 0}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, default_discount_percentage: parseFloat(e.target.value) || 0 }
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
                      value={formData.metadata?.default_copay_percentage || 0}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, default_copay_percentage: parseFloat(e.target.value) || 0 }
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
                      value={formData.metadata?.claim_payment_terms_days || 30}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, claim_payment_terms_days: parseInt(e.target.value) || 30 }
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
                      value={formData.metadata?.contract_start_date || ''}
                      onChange={e =>
                        setFormData({ ...formData, metadata: { ...formData.metadata, contract_start_date: e.target.value } })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.metadata?.contract_end_date || ''}
                      onChange={e =>
                        setFormData({ ...formData, metadata: { ...formData.metadata, contract_end_date: e.target.value } })
                      }
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
                      value={formData.metadata?.coverage_limit || ''}
                      onChange={e =>
                        setFormData({ ...formData, metadata: { ...formData.metadata, coverage_limit: parseFloat(e.target.value) || undefined } })
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
                  value={formData.metadata?.notes || ''}
                  onChange={e => setFormData({ ...formData, metadata: { ...formData.metadata, notes: e.target.value } })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.active !== false}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
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
