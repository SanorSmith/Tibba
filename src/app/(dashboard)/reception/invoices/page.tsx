'use client';

import { useEffect, useState } from 'react';
import { Receipt, Plus, Search, Eye, Trash2, Edit, X, Percent, RefreshCw, ChevronDown, Shield, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  patient_id?: string;
  patient_name?: string;
  patient_name_ar?: string;
  subtotal: number;
  discount_percentage: number;
  discount_amount: number;
  total_amount: number;
  insurance_company_id?: string;
  insurance_coverage_amount: number;
  insurance_coverage_percentage: number;
  patient_responsibility: number;
  amount_paid: number;
  balance_due: number;
  status: string;
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  insurance_companies?: {
    company_code: string;
    company_name: string;
    company_name_ar?: string;
  };
}

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
  name_ar?: string;
}

interface Service {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  category: string;
  price_self_pay: number;
  price_insurance: number;
  price_government: number;
  provider_id?: string;
  provider_name?: string;
  service_fee?: number;
}

interface LineItem {
  service_id: string;
  service_code: string;
  service_name: string;
  service_name_ar: string;
  service_category: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  provider_id?: string;
  provider_name?: string;
  service_fee?: number;
}

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [discountInvoice, setDiscountInvoice] = useState<Invoice | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  const [statusInvoice, setStatusInvoice] = useState<Invoice | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [claimInvoice, setClaimInvoice] = useState<Invoice | null>(null);
  const [claimNotes, setClaimNotes] = useState('');
  const [submittingClaim, setSubmittingClaim] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, insRes, svcRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/insurance-companies'),
        fetch('/api/services'),
      ]);
      if (invRes.ok) { 
        const invData = await invRes.json();
        setInvoices(invData.data || []);
      }
      if (insRes.ok) setInsuranceCompanies(await insRes.json());
      if (svcRes.ok) setServices(await svcRes.json());
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingInvoice(null);
    setLineItems([]);
    setFormData({
      invoice_date: new Date().toISOString().split('T')[0],
      status: 'PENDING',
      subtotal: 0,
      discount_percentage: 0,
      discount_amount: 0,
      total_amount: 0,
      insurance_coverage_amount: 0,
      insurance_coverage_percentage: 0,
      patient_responsibility: 0,
      amount_paid: 0,
      balance_due: 0,
    });
    setPatientSearch('');
    setPatientResults([]);
    setShowModal(true);
  };

  const handleEdit = async (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setLineItems([]);
    setFormData(invoice);
    setPatientSearch(invoice.patient_name_ar || invoice.patient_name || '');
    setPatientResults([]);
    setShowModal(true);

    // Fetch existing items for this invoice
    try {
      console.log('🔄 Fetching items for invoice:', invoice.id);
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const data = await res.json();
        console.log('🔄 API response:', data);
        const items = data.data?.items || data.items || [];
        console.log('🔄 Items found:', items);
        
        if (items.length > 0) {
          const mapped: LineItem[] = items.map((item: any) => {
            // Try to match back to a service by service_id or name
            const svc = services.find(
              s => s.id === item.item_code || s.name_ar === item.item_name_ar || s.name === item.item_name
            );
            
            // Use the service UUID if found, otherwise use item_code
            const serviceId = svc?.id || item.item_code || '';
            
            console.log('🔄 Service mapping:', {
              item_code: item.item_code,
              item_name: item.item_name,
              found_service: svc,
              service_id: serviceId
            });
            
            return {
              service_id: serviceId,
              service_code: item.item_code || svc?.code || '',
              service_name: item.item_name || svc?.name || '',
              service_name_ar: item.item_name_ar || svc?.name_ar || '',
              service_category: item.description || svc?.category || '',
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              line_total: item.subtotal || (item.unit_price * (item.quantity || 1)) || 0,
              provider_id: item.provider_id || svc?.provider_id,
              provider_name: item.provider_name || svc?.provider_name,
              service_fee: item.service_fee || 0,
            };
          });
          console.log('🔄 Mapped line items:', mapped);
          setLineItems(mapped);
        }
      }
    } catch (error) {
      console.error('Failed to load invoice items:', error);
    }
  };

  // Line item helpers
  const addLineItem = () => {
    setLineItems(prev => [...prev, { service_id: '', service_code: '', service_name: '', service_name_ar: '', service_category: '', quantity: 1, unit_price: 0, line_total: 0 }]);
  };

  const updateLineService = (idx: number, serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    const updated = [...lineItems];
    const qty = updated[idx].quantity || 1;
    const price = svc.price_self_pay;
    updated[idx] = { service_id: svc.id, service_code: svc.code, service_name: svc.name, service_name_ar: svc.name_ar, service_category: svc.category, quantity: qty, unit_price: price, line_total: price * qty, provider_id: svc.provider_id, provider_name: svc.provider_name, service_fee: svc.service_fee };
    setLineItems(updated);
    recalcFromLines(updated, formData.discount_percentage || 0, formData.insurance_coverage_percentage || 0);
  };

  const updateLineQty = (idx: number, qty: number) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], quantity: qty, line_total: updated[idx].unit_price * qty };
    setLineItems(updated);
    recalcFromLines(updated, formData.discount_percentage || 0, formData.insurance_coverage_percentage || 0);
  };

  const updateLinePrice = (idx: number, price: number) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], unit_price: price, line_total: price * updated[idx].quantity };
    setLineItems(updated);
    recalcFromLines(updated, formData.discount_percentage || 0, formData.insurance_coverage_percentage || 0);
  };

  const removeLineItem = (idx: number) => {
    const updated = lineItems.filter((_, i) => i !== idx);
    setLineItems(updated);
    recalcFromLines(updated, formData.discount_percentage || 0, formData.insurance_coverage_percentage || 0);
  };

  const recalcFromLines = (lines: LineItem[], discPct: number, insPct: number) => {
    const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
    const discountAmount = Math.round(subtotal * discPct / 100);
    const totalAmount = subtotal - discountAmount;
    const insuranceCoverage = Math.round(totalAmount * insPct / 100);
    const patientResp = totalAmount - insuranceCoverage;
    setFormData(prev => ({
      ...prev,
      subtotal,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      insurance_coverage_amount: insuranceCoverage,
      patient_responsibility: patientResp,
      balance_due: patientResp - (prev.amount_paid || 0),
    }));
  };

  const handleDiscountChange = (discPct: number) => {
    setFormData(prev => ({ ...prev, discount_percentage: discPct }));
    recalcFromLines(lineItems, discPct, formData.insurance_coverage_percentage || 0);
  };

  const handleInsurancePctChange = (insPct: number) => {
    setFormData(prev => ({ ...prev, insurance_coverage_percentage: insPct }));
    recalcFromLines(lineItems, formData.discount_percentage || 0, insPct);
  };

  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setPatientResults([]);
      setShowPatientDropdown(false);
      return;
    }

    try {
      const res = await fetch(`/api/tibbna-openehr-patients?search=${encodeURIComponent(query)}`);
      if (res.ok) {
        const response = await res.json();
        
        // API now returns raw array of patients
        const rawPatients = Array.isArray(response) ? response : (response.data || []);
        
        // Map to Finance app format, preserving original API fields
        const mappedPatients = rawPatients.map((p: any) => ({
          id: p.id || p.patientid || p.patient_id,
          patient_id: p.id || p.patientid || p.patient_id,
          patient_number: p.patientNumber || p.patient_number || p.id,
          first_name_ar: p.firstNameAr || p.firstname || p.first_name_ar || '',
          last_name_ar: p.lastNameAr || p.lastname || p.last_name_ar || '',
          full_name_ar: p.fullNameAr || `${p.firstNameAr || p.firstname || p.first_name_ar || ''} ${p.lastNameAr || p.lastname || p.last_name_ar || ''}`.trim(),
          first_name_en: p.firstNameEn || p.firstname || p.first_name_en || '',
          last_name_en: p.lastNameEn || p.lastname || p.last_name_en || '',
          full_name_en: p.fullNameEn || `${p.firstNameEn || p.firstname || p.first_name_en || ''} ${p.lastNameEn || p.lastname || p.last_name_en || ''}`.trim(),
          full_name: p.fullNameEn || p.fullNameAr || `${p.firstNameEn || p.firstname || ''} ${p.lastNameEn || p.lastname || ''}`.trim(),
          date_of_birth: p.dateofbirth || p.date_of_birth || '',
          gender: p.gender || 'MALE',
          phone: p.phone || '',
          email: p.email || '',
          national_id: p.nationalid || p.national_id || '',
          governorate: p.address || p.governorate || '',
          total_balance: 0,
          is_active: true,
          created_at: p.createdat || p.created_at || new Date().toISOString(),
        }));
        
        setPatientResults(mappedPatients);
        setShowPatientDropdown(mappedPatients.length > 0);
      }
    } catch (error) {
      console.error('Patient search error from Tibbna OpenEHR DB:', error);
    }
  };

  const selectPatient = async (patient: any) => {
    const patientId = patient.id || patient.patient_id;
    let autoInsCompanyId = patient.insuranceCompany?.id || patient.insurance_provider_id || formData.insurance_company_id || '';
    let autoInsPct = formData.insurance_coverage_percentage || 0;

    // Auto-fill insurance from patient_insurance table
    try {
      const piRes = await fetch(`/api/patient-insurance?patient_id=${encodeURIComponent(patientId)}`);
      if (piRes.ok) {
        const piData = await piRes.json();
        if (piData.data) {
          autoInsCompanyId = piData.data.insurance_company_id || autoInsCompanyId;
          autoInsPct = parseFloat(String(piData.data.coverage_percentage)) || autoInsPct;
        }
      }
    } catch {
      // Non-fatal — proceed without auto-fill
    }

    setFormData(prev => ({
      ...prev,
      patient_id: patientId,
      patient_name: patient.fullNameEn || patient.full_name,
      patient_name_ar: patient.fullNameAr || patient.full_name_ar,
      insurance_company_id: autoInsCompanyId,
      insurance_coverage_percentage: autoInsPct,
    }));
    setPatientSearch(patient.fullNameAr || patient.fullNameEn || patient.full_name_ar || patient.full_name);
    setShowPatientDropdown(false);
    setPatientResults([]);
  };

  const printInsuranceReport = async (inv: Invoice) => {
    const fmtN = (n: number | string) => new Intl.NumberFormat('en-IQ').format(parseFloat(String(n)) || 0);
    const fmtD = (d: string) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

    try {
      toast.info('Preparing insurance report…');
      const res = await fetch(`/api/invoices/${inv.id}/insurance-report`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      const { data } = await res.json();
      const { invoice, items, patient, insuranceCompany } = data;

      const insPct = parseFloat(invoice.insurance_coverage_percentage) || 0;

      const serviceRows = (items as any[]).map((item: any, i: number) => {
        const lineTotal = parseFloat(item.total_price ?? item.subtotal ?? (item.unit_price * (item.quantity || 1))) || 0;
        const insCovered = Math.round(lineTotal * insPct / 100);
        const patPays = lineTotal - insCovered;
        return `<tr>
          <td>${i + 1}</td>
          <td><strong>${item.service_name || item.item_name || '-'}</strong></td>
          <td style="direction:rtl;text-align:right">${item.service_name_ar || item.item_name_ar || '-'}</td>
          <td class="r">${item.quantity || 1}</td>
          <td class="r">${fmtN(item.unit_price)}</td>
          <td class="r"><strong>${fmtN(lineTotal)}</strong></td>
          <td class="r ins">${fmtN(insCovered)}</td>
          <td class="r pat">${fmtN(patPays)}</td>
        </tr>`;
      }).join('');

      const hasMedical = patient?.medical_history || patient?.allergies || patient?.chronic_diseases || patient?.current_medications;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Insurance Report – ${invoice.invoice_number}</title>
  <style>
    @page { size: A4; margin: 14mm 18mm; }
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5px;color:#1a1a2e;background:#fff}
    .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:3px solid #0066cc;margin-bottom:14px}
    .hosp-name{font-size:20px;font-weight:800;color:#0066cc;letter-spacing:-.5px}
    .hosp-sub{font-size:9px;color:#888;margin-top:2px}
    .badge{background:#0066cc;color:#fff;padding:5px 14px;border-radius:20px;font-size:11px;font-weight:700}
    .gen-date{font-size:8.5px;color:#aaa;text-align:right;margin-top:4px}
    .sec{margin-bottom:13px}
    .sec-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#0066cc;border-bottom:1px solid #e0e0e0;padding-bottom:3px;margin-bottom:7px}
    .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
    .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}
    .ibox{background:#f8fafc;border-radius:5px;padding:5px 9px;border-left:3px solid #0066cc}
    .ilbl{font-size:8.5px;color:#888;font-weight:600;text-transform:uppercase}
    .ival{font-size:10.5px;font-weight:600;margin-top:1px}
    .med-box{background:#fff8f0;border:1px solid #ffe0b2;border-radius:7px;padding:9px 13px}
    .mlbl{font-size:8.5px;color:#e65100;font-weight:700;text-transform:uppercase}
    .mval{font-size:10px;color:#3e2723;margin-top:2px;line-height:1.45;white-space:pre-wrap}
    .mitem{margin-bottom:6px}
    .mitem:last-child{margin-bottom:0}
    .ins-box{background:#e8f4fd;border:1px solid #b3d9f7;border-radius:7px;padding:9px 13px}
    table{width:100%;border-collapse:collapse;font-size:9.5px}
    thead tr{background:#0066cc;color:#fff}
    th{padding:5px 7px;text-align:left;font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    th.r,td.r{text-align:right}
    tbody tr:nth-child(even){background:#f8fafc}
    td{padding:5px 7px;border-bottom:1px solid #eee}
    td.ins{color:#0066cc;font-weight:600}
    td.pat{color:#c62828;font-weight:600}
    tfoot tr{background:#dbeafe;font-weight:700}
    tfoot td{padding:5px 7px;font-size:10px}
    .fin{background:#f8fafc;border-radius:7px;padding:8px 12px;border:1px solid #e0e0e0}
    .fr{display:flex;justify-content:space-between;padding:2.5px 0;font-size:10px}
    .fr.tot{border-top:2px solid #0066cc;margin-top:4px;padding-top:5px;font-size:12px;font-weight:800;color:#0066cc}
    .fr.ins-r{color:#0066cc}
    .fr.paid{color:#2e7d32}
    .fr.bal{color:#c62828;font-weight:700;font-size:11px}
    .fr.resp{border-top:1px dashed #ccc;margin-top:4px;padding-top:4px;font-weight:700}
    .st{display:inline-block;padding:1.5px 7px;border-radius:10px;font-size:8.5px;font-weight:700}
    .st-PAID{background:#e8f5e9;color:#2e7d32}
    .st-PARTIALLY_PAID{background:#fff8e1;color:#f57f17}
    .st-PENDING{background:#e3f2fd;color:#1565c0}
    .st-UNPAID{background:#ffebee;color:#c62828}
    .st-CANCELLED{background:#f5f5f5;color:#757575}
    .foot{margin-top:18px;padding-top:8px;border-top:1px solid #e0e0e0;display:flex;justify-content:space-between;align-items:flex-end}
    .foot-note{font-size:7.5px;color:#bbb;max-width:55%;line-height:1.4}
    .sig{text-align:center}
    .sig-line{border-top:1px solid #555;width:120px;margin:0 auto}
    .sig-lbl{font-size:7.5px;color:#aaa;margin-top:2px}
    @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
  </style>
</head>
<body>
  <div class="hdr">
    <div>
      <div class="hosp-name">Tibbna Hospital</div>
      <div class="hosp-sub">Healthcare Management System</div>
    </div>
    <div style="text-align:right">
      <div class="badge">Insurance Claim Report</div>
      <div class="gen-date">Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}</div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">Patient Information</div>
    <div class="grid3">
      <div class="ibox"><div class="ilbl">Full Name</div><div class="ival">${invoice.patient_name || patient?.full_name || '-'}</div></div>
      <div class="ibox"><div class="ilbl">Arabic Name</div><div class="ival" style="direction:rtl">${invoice.patient_name_ar || patient?.full_name_ar || '-'}</div></div>
      <div class="ibox"><div class="ilbl">Patient ID</div><div class="ival" style="font-family:monospace;font-size:8.5px">${invoice.patient_id || '-'}</div></div>
      <div class="ibox"><div class="ilbl">Date of Birth</div><div class="ival">${patient?.date_of_birth ? fmtD(patient.date_of_birth) : '-'}</div></div>
      <div class="ibox"><div class="ilbl">Gender</div><div class="ival">${patient?.gender || '-'}</div></div>
      <div class="ibox"><div class="ilbl">National ID</div><div class="ival">${patient?.national_id || '-'}</div></div>
      ${patient?.phone ? `<div class="ibox"><div class="ilbl">Phone</div><div class="ival">${patient.phone}</div></div>` : ''}
      ${patient?.blood_group ? `<div class="ibox"><div class="ilbl">Blood Group</div><div class="ival">${patient.blood_group}</div></div>` : ''}
    </div>
  </div>

  ${hasMedical ? `
  <div class="sec">
    <div class="sec-title">Medical Information &amp; Diagnoses</div>
    <div class="med-box">
      ${patient?.medical_history ? `<div class="mitem"><div class="mlbl">Medical History &amp; Diagnoses</div><div class="mval">${patient.medical_history}</div></div>` : ''}
      ${patient?.chronic_diseases ? `<div class="mitem"><div class="mlbl">Chronic Diseases</div><div class="mval">${patient.chronic_diseases}</div></div>` : ''}
      ${patient?.allergies ? `<div class="mitem"><div class="mlbl">Allergies</div><div class="mval">${patient.allergies}</div></div>` : ''}
      ${patient?.current_medications ? `<div class="mitem"><div class="mlbl">Current Medications</div><div class="mval">${patient.current_medications}</div></div>` : ''}
    </div>
  </div>` : ''}

  <div class="sec">
    <div class="sec-title">Insurance &amp; Invoice Details</div>
    <div class="grid2">
      <div class="ins-box">
        <div class="ilbl" style="color:#0066cc">Insurance Company</div>
        <div style="font-size:14px;font-weight:800;color:#0066cc;margin-top:3px">${insuranceCompany?.name || '-'}</div>
        ${insuranceCompany?.code ? `<div style="font-size:8.5px;color:#666;margin-top:1px">Code: ${insuranceCompany.code}</div>` : ''}
        <div style="margin-top:6px"><span class="ilbl">Coverage: </span><span style="font-size:15px;font-weight:900;color:#0066cc">${insPct}%</span></div>
      </div>
      <div class="fin" style="border-left:4px solid #0066cc">
        <div class="fr"><span style="color:#888">Invoice #</span><span style="font-family:monospace;font-weight:600">${invoice.invoice_number}</span></div>
        <div class="fr"><span style="color:#888">Invoice Date</span><span>${fmtD(invoice.invoice_date)}</span></div>
        <div class="fr"><span style="color:#888">Status</span><span class="st st-${invoice.status}">${invoice.status.replace(/_/g,' ')}</span></div>
        ${invoice.payment_method ? `<div class="fr"><span style="color:#888">Payment Method</span><span>${invoice.payment_method}</span></div>` : ''}
      </div>
    </div>
  </div>

  <div class="sec">
    <div class="sec-title">Medical Services Rendered</div>
    <table>
      <thead><tr>
        <th>#</th><th>Service Name</th><th style="text-align:right">Arabic Name</th>
        <th class="r">Qty</th><th class="r">Unit Price</th><th class="r">Total (IQD)</th>
        <th class="r">Ins. Covered</th><th class="r">Patient Pays</th>
      </tr></thead>
      <tbody>${serviceRows}</tbody>
      <tfoot><tr>
        <td colspan="5" style="text-align:right;color:#888;font-size:9px">TOTALS</td>
        <td class="r">${fmtN(invoice.total_amount)} IQD</td>
        <td class="r ins">${fmtN(invoice.insurance_coverage_amount)} IQD</td>
        <td class="r pat">${fmtN(invoice.patient_responsibility)} IQD</td>
      </tr></tfoot>
    </table>
  </div>

  <div class="sec">
    <div class="sec-title">Financial Summary</div>
    <div class="grid2">
      <div class="fin">
        <div class="fr"><span style="color:#888">Subtotal</span><span>${fmtN(invoice.subtotal)} IQD</span></div>
        ${parseFloat(invoice.discount_percentage) > 0 ? `<div class="fr" style="color:#f57f17"><span>Discount (${parseFloat(invoice.discount_percentage)}%)</span><span>-${fmtN(invoice.discount_amount)} IQD</span></div>` : ''}
        <div class="fr tot"><span>Grand Total</span><span>${fmtN(invoice.total_amount)} IQD</span></div>
      </div>
      <div class="fin">
        <div class="fr ins-r"><span>Insurance Coverage (${insPct}%)</span><span>-${fmtN(invoice.insurance_coverage_amount)} IQD</span></div>
        <div class="fr resp"><span>Patient Responsibility</span><span>${fmtN(invoice.patient_responsibility)} IQD</span></div>
        <div class="fr paid"><span>Amount Paid</span><span>-${fmtN(invoice.amount_paid)} IQD</span></div>
        <div class="fr bal"><span>Balance Due</span><span>${fmtN(invoice.balance_due)} IQD</span></div>
      </div>
    </div>
  </div>

  <div class="foot">
    <div class="foot-note">
      Official insurance claim report — Tibbna Hospital Management System.<br>
      Computer-generated document. Valid without signature unless stated otherwise.<br>
      For queries contact the billing department.
    </div>
    <div style="display:flex;gap:28px">
      <div class="sig"><div class="sig-line"></div><div class="sig-lbl">Treating Physician</div></div>
      <div class="sig"><div class="sig-line"></div><div class="sig-lbl">Billing Department</div></div>
    </div>
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

      const pw = window.open('', '_blank', 'width=900,height=750');
      if (pw) {
        pw.document.write(html);
        pw.document.close();
      } else {
        toast.error('Please allow pop-ups to print the report');
      }
    } catch (err) {
      console.error('printInsuranceReport error:', err);
      toast.error('Failed to generate report');
    }
  };

  const autoSubmitClaim = async (invoice: any) => {
    try {
      const insCompany = insuranceCompanies.find(c => c.id === invoice.insurance_company_id);
      const res = await fetch('/api/insurance-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          patient_id: invoice.patient_id,
          patient_name: invoice.patient_name,
          patient_name_ar: invoice.patient_name_ar,
          insurance_company_id: invoice.insurance_company_id,
          insurance_company_name: insCompany?.name || '',
          claim_amount: parseFloat(String(invoice.insurance_coverage_amount)) || 0,
          service_date: invoice.invoice_date,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Claim ${data.data.claim_number} auto-submitted to Finance`);
      } else if (res.status === 409) {
        // Claim already exists — silent
      } else {
        toast.warning('Invoice saved. Claim auto-submit failed — use the 🛡️ button to retry.');
      }
    } catch {
      toast.warning('Invoice saved. Claim auto-submit failed — use the 🛡️ button to retry.');
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.invoice_date) { toast.error('Invoice date is required'); return; }
      if (!formData.patient_id) { toast.error('Please select a patient'); return; }
      if (lineItems.length === 0) { toast.error('Add at least one service'); return; }
      if (lineItems.some(l => !l.service_id && !l.service_name)) { toast.error('Select a service for each line'); return; }
      if (lineItems.some(l => l.unit_price <= 0)) { toast.error('Unit price must be greater than 0 for all services'); return; }

      const payload = {
        ...formData,
        items: lineItems.map(l => ({
          item_type: 'SERVICE',
          item_code: l.service_code,
          item_name: l.service_name,
          item_name_ar: l.service_name_ar,
          description: l.service_category,
          quantity: l.quantity,
          unit_price: l.unit_price,
          subtotal: l.line_total,
          insurance_covered: (formData.insurance_company_id || '') !== '',
          insurance_coverage_percentage: formData.insurance_coverage_percentage || 0,
          insurance_amount: Math.round(l.line_total * (formData.insurance_coverage_percentage || 0) / 100),
          patient_amount: l.line_total - Math.round(l.line_total * (formData.insurance_coverage_percentage || 0) / 100),
          provider_id: l.provider_id || null,
          provider_name: l.provider_name || null,
          service_fee: l.service_fee || 0,
        })),
      };

      const url = editingInvoice ? `/api/invoices/${editingInvoice.id}` : '/api/invoices';
      const method = editingInvoice ? 'PUT' : 'POST';

      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

      if (res.ok) {
        const savedData = await res.json();
        toast.success(editingInvoice ? 'Invoice updated' : 'Invoice created');

        // Auto-submit claim to Finance for new invoices that have insurance
        if (!editingInvoice && parseFloat(String(savedData.data?.insurance_coverage_amount)) > 0) {
          if (savedData.data?.insurance_company_id) {
            await autoSubmitClaim(savedData.data);
          } else {
            toast.info('Invoice saved with insurance coverage — select an insurance company then use the 🛡️ button to submit the claim.');
          }
        }

        setShowModal(false);
        loadData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save invoice');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save invoice');
    }
  };

  const handleQuickDiscount = async () => {
    if (!discountInvoice) return;

    try {
      const originalSubtotal = discountInvoice.subtotal;
      const discountAmount = (originalSubtotal * discountValue) / 100;
      const newTotal = originalSubtotal - discountAmount;
      const insuranceCoverage = (newTotal * discountInvoice.insurance_coverage_percentage) / 100;
      const patientResp = newTotal - insuranceCoverage;
      const balanceDue = patientResp - discountInvoice.amount_paid;

      const res = await fetch(`/api/invoices/${discountInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...discountInvoice,
          discount_percentage: discountValue,
          discount_amount: discountAmount,
          total_amount: newTotal,
          insurance_coverage_amount: insuranceCoverage,
          patient_responsibility: patientResp,
          balance_due: balanceDue,
        }),
      });

      if (res.ok) {
        toast.success(`${discountValue}% discount applied`);
        setDiscountInvoice(null);
        setDiscountValue(0);
        loadData();
      } else {
        toast.error('Failed to apply discount');
      }
    } catch (error) {
      console.error('Discount error:', error);
      toast.error('Failed to apply discount');
    }
  };

  const handleQuickStatusUpdate = async () => {
    if (!statusInvoice || !newStatus) return;

    try {
      const updateData: any = {
        ...statusInvoice,
        status: newStatus,
      };

      // If marking as PAID, update payment details
      if (newStatus === 'PAID' && statusInvoice.balance_due > 0) {
        updateData.amount_paid = statusInvoice.patient_responsibility;
        updateData.balance_due = 0;
        updateData.payment_date = new Date().toISOString().split('T')[0];
        if (!updateData.payment_method) {
          updateData.payment_method = 'CASH';
        }
      }

      const res = await fetch(`/api/invoices/${statusInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success(`Status updated to ${newStatus}`);
        setStatusInvoice(null);
        setNewStatus('');
        loadData();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this invoice?')) return;

    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('Invoice deleted');
        loadData();
      } else {
        toast.error('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (statusFilter !== 'ALL' && inv.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        inv.invoice_number.toLowerCase().includes(s) ||
        inv.patient_name?.toLowerCase().includes(s) ||
        inv.patient_name_ar?.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((s, i) => s + (parseFloat(String(i.total_amount)) || 0), 0),
    collected: invoices.reduce((s, i) => s + (parseFloat(String(i.amount_paid)) || 0), 0),
    outstanding: invoices.reduce((s, i) => s + (parseFloat(String(i.balance_due)) || 0), 0),
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'PAID': return 'bg-emerald-100 text-emerald-700';
      case 'PARTIALLY_PAID': return 'bg-amber-100 text-amber-700';
      case 'PENDING': return 'bg-blue-100 text-blue-700';
      case 'UNPAID': return 'bg-red-100 text-red-700';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-8 w-48 bg-gray-200 rounded" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Invoices</h1>
          <p className="text-gray-500 text-sm">Manage customer invoices and payments</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:opacity-90 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Total Customer Invoices</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Total Amount</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{fmt(stats.totalAmount)} IQD</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Collected</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{fmt(stats.collected)} IQD</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="text-xs text-gray-500">Outstanding</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{fmt(stats.outstanding)} IQD</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice # or patient name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partially Paid</option>
          <option value="PENDING">Pending</option>
          <option value="UNPAID">Unpaid</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Patient</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total (IQD)</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Insurance</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Balance Due</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredInvoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-600">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString('en-GB') : '-'}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{inv.patient_name_ar || inv.patient_name || '-'}</div>
                    {inv.patient_id && <div className="text-xs text-gray-500">{inv.patient_id}</div>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{fmt(inv.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    {inv.insurance_coverage_amount > 0 ? fmt(inv.insurance_coverage_amount) : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    {inv.balance_due > 0 ? fmt(inv.balance_due) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={async () => {
                          setViewInvoice(inv);
                          setViewItems([]);
                          try {
                            console.log('🔄 Loading view items for invoice:', inv.id);
                            const r = await fetch(`/api/invoices/${inv.id}`);
                            if (r.ok) { 
                              const d = await r.json(); 
                              console.log('🔄 View API response:', d);
                              const items = d.data?.items || d.items || [];
                              console.log('🔄 Setting viewItems:', items);
                              setViewItems(items); 
                            }
                          } catch (error) {
                            console.error('Error loading view items:', error);
                          }
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="View"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => {
                          setDiscountInvoice(inv);
                          setDiscountValue(inv.discount_percentage || 0);
                        }}
                        className="p-1 hover:bg-blue-50 rounded"
                        title="Apply Discount"
                      >
                        <Percent className="w-4 h-4 text-blue-600" />
                      </button>
                      <button
                        onClick={() => {
                          setStatusInvoice(inv);
                          setNewStatus(inv.status);
                        }}
                        className="p-1 hover:bg-green-50 rounded"
                        title="Update Status"
                      >
                        <RefreshCw className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        onClick={() => handleEdit(inv)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      {inv.insurance_coverage_amount > 0 && inv.status !== 'CANCELLED' && (
                        <button
                          onClick={() => { setClaimInvoice(inv); setClaimNotes(''); }}
                          className="p-1 hover:bg-blue-50 rounded"
                          title="Submit Insurance Claim"
                        >
                          <Shield className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {inv.insurance_coverage_amount > 0 && (
                        <button
                          onClick={() => printInsuranceReport(inv)}
                          className="p-1 hover:bg-purple-50 rounded"
                          title="Print Insurance Report (PDF)"
                        >
                          <Printer className="w-4 h-4 text-purple-600" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title="Delete"
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
        {filteredInvoices.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No customer invoices found
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                  >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Invoice Information</h3>
                <div className="space-y-4">
                  {/* Auto-generated Invoice Number Info */}
                  {!editingInvoice && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="text-blue-600 mt-0.5">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-blue-900">Invoice Number Auto-Generated</div>
                          <div className="text-xs text-blue-700 mt-0.5">
                            The system will automatically generate an invoice number in format: INV-YYYY-XXXXX
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show invoice number for editing */}
                  {editingInvoice && formData.invoice_number && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Invoice Number
                      </label>
                      <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm font-mono text-gray-700">
                        {formData.invoice_number}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Invoice Date *
                    </label>
                    <input
                      type="date"
                      value={formData.invoice_date || ''}
                      onChange={e => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Patient Info */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Patient Information</h3>
                <div className="space-y-4">
                  {/* Patient Search with Autocomplete */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Search Patient *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={e => {
                          setPatientSearch(e.target.value);
                          searchPatients(e.target.value);
                        }}
                        onFocus={() => {
                          if (patientResults.length > 0) setShowPatientDropdown(true);
                        }}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
                        placeholder="Search by patient name or ID..."
                      />
                    </div>
                    
                    {/* Autocomplete Dropdown */}
                    {showPatientDropdown && patientResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {patientResults.map((patient) => (
                          <button
                            key={patient.id}
                            type="button"
                            onClick={() => selectPatient(patient)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {patient.full_name_ar || patient.full_name}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  ID: {patient.patient_id}
                                  {patient.phone && ` • ${patient.phone}`}
                                </div>
                              </div>
                              {patient.insurance_provider_id && (
                                <div className="ml-2">
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                    Insured
                                  </span>
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Display Selected Patient Info */}
                  {formData.patient_id && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="text-xs font-medium text-gray-700 mb-2">Selected Patient:</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500 text-xs">Patient ID:</span>
                          <div className="font-medium">{formData.patient_id}</div>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Name (English):</span>
                          <div className="font-medium">{formData.patient_name || '-'}</div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-500 text-xs">Name (Arabic):</span>
                          <div className="font-medium">{formData.patient_name_ar || '-'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Services */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Services *</h3>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600"
                  >
                    <Plus className="w-3 h-3" /> Add Service
                  </button>
                </div>

                {lineItems.length === 0 && (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400">
                    No services added yet. Click "Add Service" to begin.
                  </div>
                )}

                <div className="space-y-2">
                  {lineItems.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-gray-50 rounded-lg p-3">
                      {/* Service selector */}
                      <div className="col-span-5">
                        <label className="block text-xs text-gray-500 mb-1">Service</label>
                        <select
                          value={line.service_id}
                          onChange={e => updateLineService(idx, e.target.value)}
                          className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white"
                        >
                          <option value="">Select service...</option>
                          {services.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} - {s.name_ar}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Unit price */}
                      <div className="col-span-3">
                        <label className="block text-xs text-gray-500 mb-1">Unit Price (IQD)</label>
                        <input
                          type="number"
                          min="0"
                          value={line.unit_price || 0}
                          onChange={e => updateLinePrice(idx, parseFloat(e.target.value) || 0)}
                          className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white"
                        />
                      </div>
                      {/* Quantity */}
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity || 1}
                          onChange={e => updateLineQty(idx, parseInt(e.target.value) || 1)}
                          className="w-full border rounded-lg px-2 py-1.5 text-xs bg-white"
                        />
                      </div>
                      {/* Line total + remove */}
                      <div className="col-span-2 flex items-end gap-1">
                        <div className="flex-1 text-right">
                          <div className="text-xs text-gray-500 mb-1">Total</div>
                          <div className="text-sm font-bold text-gray-900">{fmt(line.line_total)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded mb-0.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {lineItems.length > 0 && (
                  <div className="mt-2 flex justify-end text-sm font-medium text-gray-700 bg-blue-50 rounded-lg px-4 py-2">
                    Services Subtotal: <span className="ml-2 font-bold text-gray-900">{fmt(formData.subtotal || 0)} IQD</span>
                  </div>
                )}
              </div>

              {/* Financial Details */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Financial Details</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Subtotal (IQD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      readOnly={lineItems.length > 0}
                      value={formData.subtotal || 0}
                      onChange={e => lineItems.length === 0 && setFormData({ ...formData, subtotal: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${lineItems.length > 0 ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`}
                    />
                    {lineItems.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Auto-calculated from services</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Discount %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.discount_percentage || 0}
                      onChange={e => handleDiscountChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Amount (IQD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      readOnly={lineItems.length > 0}
                      value={formData.total_amount || 0}
                      onChange={e => lineItems.length === 0 && setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-bold ${lineItems.length > 0 ? 'bg-gray-50 text-gray-900 cursor-not-allowed' : ''}`}
                    />
                    {lineItems.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Subtotal minus discount</p>}
                  </div>
                </div>
              </div>

              {/* Insurance */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Insurance Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Insurance Company</label>
                    <select
                      value={formData.insurance_company_id || ''}
                      onChange={e => setFormData({ ...formData, insurance_company_id: e.target.value || '' })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">No Insurance</option>
                      {insuranceCompanies.map(ins => (
                        <option key={ins.id} value={ins.id}>
                          {ins.name} ({ins.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Coverage %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.insurance_coverage_percentage || 0}
                      onChange={e => handleInsurancePctChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Coverage Amount (IQD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      readOnly={lineItems.length > 0}
                      value={formData.insurance_coverage_amount || 0}
                      onChange={e => lineItems.length === 0 && setFormData({ ...formData, insurance_coverage_amount: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${lineItems.length > 0 ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                    {lineItems.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Auto-calculated from coverage %</p>}
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Payment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Patient Responsibility (IQD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      readOnly={lineItems.length > 0}
                      value={formData.patient_responsibility || 0}
                      onChange={e => lineItems.length === 0 && setFormData({ ...formData, patient_responsibility: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm font-bold ${lineItems.length > 0 ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                    {lineItems.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Total minus insurance</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount Paid (IQD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.amount_paid || 0}
                      onChange={e => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Balance Due (IQD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      readOnly={lineItems.length > 0}
                      value={formData.balance_due || 0}
                      onChange={e => lineItems.length === 0 && setFormData({ ...formData, balance_due: parseFloat(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm ${lineItems.length > 0 ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                    />
                    {lineItems.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Responsibility minus paid</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status || 'PENDING'}
                      onChange={e => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PAID">Paid</option>
                      <option value="PARTIALLY_PAID">Partially Paid</option>
                      <option value="UNPAID">Unpaid</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                      value={formData.payment_method || ''}
                      onChange={e => setFormData({ ...formData, payment_method: e.target.value || '' })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Select Method</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="INSURANCE">Insurance</option>
                      <option value="CHECK">Check</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
                    <input
                      type="date"
                      value={formData.payment_date || ''}
                      onChange={e => setFormData({ ...formData, payment_date: e.target.value || '' })}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                />
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
                {editingInvoice ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                  >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">{viewInvoice.invoice_number}</h2>
              <p className="text-xs text-gray-500">Invoice Date: {viewInvoice.invoice_date ? new Date(viewInvoice.invoice_date).toLocaleDateString('en-GB') : '-'}</p>
            </div>
            <div className="p-6 space-y-5">
              {/* Patient & Status */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 block text-xs">Patient</span>
                  <span className="font-medium">{viewInvoice.patient_name_ar || viewInvoice.patient_name || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(viewInvoice.status)}`}>
                    {viewInvoice.status}
                  </span>
                </div>
              </div>

              {/* Services table */}
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Services</h3>
                
                {viewItems.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No services recorded for this invoice.</p>
                ) : (
                  <div className="space-y-2">
                    {viewItems.map((item: any, i: number) => (
                      <div key={i} className="bg-white border rounded-lg p-3 mb-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium text-sm">{item.item_name_ar || item.item_name}</div>
                            {item.item_name_ar && item.item_name && <div className="text-xs text-gray-400">{item.item_name}</div>}
                            {item.item_code && <div className="text-xs text-gray-400 font-mono">{item.item_code}</div>}
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                            <div className="font-medium">{fmt(item.unit_price)} IQD</div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t">
                          <span className="text-xs text-gray-500">Total</span>
                          <span className="font-medium">{fmt(item.subtotal || item.unit_price * item.quantity)} IQD</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial summary */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Financial Summary</h3>
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(viewInvoice.subtotal)} IQD</span></div>
                {viewInvoice.discount_percentage > 0 && (
                  <div className="flex justify-between text-amber-700"><span>Discount ({viewInvoice.discount_percentage}%)</span><span>-{fmt(viewInvoice.discount_amount)} IQD</span></div>
                )}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{fmt(viewInvoice.total_amount)} IQD</span></div>
                {viewInvoice.insurance_coverage_amount > 0 && (
                  <div className="flex justify-between text-blue-700"><span>Insurance ({viewInvoice.insurance_coverage_percentage}%)</span><span>-{fmt(viewInvoice.insurance_coverage_amount)} IQD</span></div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-2"><span>Patient Pays</span><span>{fmt(viewInvoice.patient_responsibility)} IQD</span></div>
                <div className="flex justify-between text-emerald-600"><span>Amount Paid</span><span>{fmt(viewInvoice.amount_paid)} IQD</span></div>
                <div className="flex justify-between font-bold text-red-600"><span>Balance Due</span><span>{fmt(viewInvoice.balance_due)} IQD</span></div>
                {viewInvoice.payment_method && (
                  <div className="flex justify-between text-gray-500 text-xs pt-1 border-t"><span>Payment Method</span><span>{viewInvoice.payment_method}</span></div>
                )}
              </div>

              {viewInvoice.notes && (
                <div>
                  <span className="text-gray-500 block text-xs mb-1">Notes</span>
                  <span className="text-sm">{viewInvoice.notes}</span>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discount Modal */}
      {discountInvoice && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                  >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Apply Discount</h2>
              <button onClick={() => setDiscountInvoice(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Invoice: <span className="font-mono font-medium">{discountInvoice.invoice_number}</span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Patient: <span className="font-medium">{discountInvoice.patient_name_ar || discountInvoice.patient_name || '-'}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Original Subtotal:</span>
                  <span className="font-medium">{fmt(discountInvoice.subtotal)} IQD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Discount:</span>
                  <span className="font-medium">{discountInvoice.discount_percentage}%</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Current Total:</span>
                  <span className="font-bold">{fmt(discountInvoice.total_amount)} IQD</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Discount Percentage
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={discountValue}
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-4 py-2 border rounded-lg text-lg font-medium"
                  />
                  <span className="text-2xl font-bold text-gray-600">%</span>
                </div>
              </div>

              {discountValue > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="font-medium text-blue-900 mb-2">New Calculation:</div>
                  <div className="flex justify-between text-blue-800">
                    <span>Discount Amount:</span>
                    <span className="font-medium">{fmt((discountInvoice.subtotal * discountValue) / 100)} IQD</span>
                  </div>
                  <div className="flex justify-between text-blue-800">
                    <span>New Total:</span>
                    <span className="font-bold">{fmt(discountInvoice.subtotal - (discountInvoice.subtotal * discountValue) / 100)} IQD</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setDiscountInvoice(null)}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickDiscount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Apply Discount
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Insurance Claim Modal */}
      {claimInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Submit Insurance Claim</h2>
              <button onClick={() => setClaimInvoice(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice:</span>
                  <span className="font-mono font-medium">{claimInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Patient:</span>
                  <span className="font-medium">{claimInvoice.patient_name_ar || claimInvoice.patient_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Insurance:</span>
                  <span className="font-medium">
                    {insuranceCompanies.find(c => c.id === claimInvoice.insurance_company_id)?.name || claimInvoice.insurance_companies?.company_name || claimInvoice.insurance_company_id || '-'}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span className="text-gray-600">Claim Amount:</span>
                  <span className="text-blue-700">{fmt(parseFloat(String(claimInvoice.insurance_coverage_amount)) || 0)} IQD</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={claimNotes}
                  onChange={e => setClaimNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={3}
                  placeholder="Any additional notes for the claim..."
                />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setClaimInvoice(null)}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                disabled={submittingClaim}
                onClick={async () => {
                  if (!claimInvoice) return;
                  setSubmittingClaim(true);
                  try {
                    const insCompany = insuranceCompanies.find(c => c.id === claimInvoice.insurance_company_id);
                    const res = await fetch('/api/insurance-claims', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        invoice_id: claimInvoice.id,
                        invoice_number: claimInvoice.invoice_number,
                        patient_id: claimInvoice.patient_id,
                        patient_name: claimInvoice.patient_name,
                        patient_name_ar: claimInvoice.patient_name_ar,
                        insurance_company_id: claimInvoice.insurance_company_id,
                        insurance_company_name: insCompany?.name || claimInvoice.insurance_companies?.company_name || '',
                        claim_amount: parseFloat(String(claimInvoice.insurance_coverage_amount)) || 0,
                        service_date: claimInvoice.invoice_date,
                        notes: claimNotes || null,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      toast.success(`Claim ${data.data.claim_number} submitted to Finance`);
                      setClaimInvoice(null);
                    } else if (res.status === 409) {
                      const data = await res.json();
                      toast.warning(`A claim already exists for this invoice (${data.existing?.claim_number || 'existing'})`);
                      setClaimInvoice(null);
                    } else {
                      const data = await res.json();
                      toast.error(data.error || 'Failed to submit claim');
                    }
                  } catch {
                    toast.error('Failed to submit claim');
                  } finally {
                    setSubmittingClaim(false);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submittingClaim ? 'Submitting...' : 'Submit Claim'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusInvoice && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                  >
          <div
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold">Update Invoice Status</h2>
              <button onClick={() => setStatusInvoice(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-2">
                  Invoice: <span className="font-mono font-medium">{statusInvoice.invoice_number}</span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  Patient: <span className="font-medium">{statusInvoice.patient_name_ar || statusInvoice.patient_name || '-'}</span>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-medium">{fmt(statusInvoice.total_amount)} IQD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Paid:</span>
                  <span className="font-medium text-emerald-600">{fmt(statusInvoice.amount_paid)} IQD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Balance Due:</span>
                  <span className="font-medium text-red-600">{fmt(statusInvoice.balance_due)} IQD</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Current Status:</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(statusInvoice.status)}`}>
                    {statusInvoice.status}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg text-sm font-medium"
                >
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="PARTIALLY_PAID">Partially Paid</option>
                  <option value="UNPAID">Unpaid</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>

              {newStatus === 'PAID' && statusInvoice.balance_due > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                  <div className="font-medium mb-1">⚠️ Auto-payment will be recorded</div>
                  <div className="text-xs">
                    Marking as PAID will automatically record payment of {fmt(statusInvoice.balance_due)} IQD and set balance to 0.
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setStatusInvoice(null)}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleQuickStatusUpdate}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
