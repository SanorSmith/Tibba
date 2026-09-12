'use client';

import { useEffect, useState } from 'react';
import { Receipt, Plus, Search, Eye, Trash2, Edit, X, Percent, RefreshCw, ChevronDown, Shield, Printer, CheckCircle } from 'lucide-react';
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
  latest_claim_id?: string;
  latest_claim_status?: string;
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
  discount_percentage: number;
  line_total: number;
  provider_id?: string;
  provider_name?: string;
  service_fee?: number;
  stakeholder_id?: string;       // physician assigned to this line (OpenEHR-pulled lines only)
  fromOpenEHR?: boolean;
  orderGroup?: string;
  openehr_source_uid?: string;   // OpenEHR composition uid this line was pulled from
  openehr_order_id?: string;     // OpenEHR order/request id this line was pulled from
}

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<InsuranceCompany[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  // All active stakeholders — used to let staff assign a physician to
  // OpenEHR-pulled lines, which have no catalog service and therefore no
  // per-service provider list to pick from (see updateLineProvider usage below).
  const [allStakeholders, setAllStakeholders] = useState<{stakeholder_id: string; name_en: string; name_ar: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [formData, setFormData] = useState<Partial<Invoice>>({});
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [patientNationalId, setPatientNationalId] = useState('');
  const [pullingOrders, setPullingOrders] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (g: string) =>
    setCollapsedGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
  // Pull filters: narrow which OpenEHR orders come back
  const [pullDateFrom, setPullDateFrom] = useState('');
  const [pullDateTo, setPullDateTo] = useState('');
  const [pullOrderId, setPullOrderId] = useState('');
  const [pullSkipPaid, setPullSkipPaid] = useState(true);
  // Orders matched by the last pull, waiting for the user to click "+" to add them
  const [openEhrCandidates, setOpenEhrCandidates] = useState<any[]>([]);
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

  // Insurance categories state
  const [insuranceCategories, setInsuranceCategories] = useState<{id: number; category_name: string; coverage_percentage: number}[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');

  // Generated invoice number
  const [generatedInvoiceNumber, setGeneratedInvoiceNumber] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, insRes, svcRes, stkRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/insurance-companies'),
        fetch('/api/services'),
        fetch('/api/stakeholders?is_active=true'),
      ]);
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvoices(invData.data || []);
      }
      if (insRes.ok) setInsuranceCompanies(await insRes.json());
      if (svcRes.ok) setServices(await svcRes.json());
      if (stkRes.ok) {
        const stkData = await stkRes.json();
        setAllStakeholders(stkData.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingInvoice(null);
    setLineItems([]);
    setFormData({
      invoice_date: today,
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
    setOpenEhrCandidates([]);
    setGeneratedInvoiceNumber(`INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`);
    setShowModal(true);
  };

  const handleEdit = async (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setLineItems([]);
    setFormData(invoice);
    setPatientSearch(invoice.patient_name_ar || invoice.patient_name || '');
    setPatientResults([]);
    setGeneratedInvoiceNumber(invoice.invoice_number || '');
    setOpenEhrCandidates([]);
    setShowModal(true);

    // selectPatient() (used when creating a new invoice) sets patientNationalId
    // and pre-fetches insurance categories as side effects of the search picker —
    // handleEdit bypasses that picker entirely, so both were silently skipped,
    // leaving "🩺 Get Orders" permanently disabled and the Insurance Category
    // dropdown showing "No categories defined" even when the company has some.
    setPatientNationalId('');
    if (invoice.patient_id) {
      try {
        const searchTerm = invoice.patient_name_ar || invoice.patient_name || '';
        if (searchTerm) {
          const pRes = await fetch(`/api/tibbna-openehr-patients?search=${encodeURIComponent(searchTerm)}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            const list = Array.isArray(pData) ? pData : (pData.data || []);
            const match = list.find((p: any) => (p.id || p.patient_id) === invoice.patient_id);
            if (match) setPatientNationalId(match.nationalId || match.national_id || '');
          }
        }
      } catch { /* non-fatal — Get Orders just stays disabled */ }
    }
    setInsuranceCategories([]);
    setSelectedCategory('');
    if (invoice.insurance_company_id) {
      try {
        const cRes = await fetch(`/api/insurance-companies/${invoice.insurance_company_id}/categories`);
        if (cRes.ok) {
          const cData = await cRes.json();
          const cats = cData.data || [];
          setInsuranceCategories(cats);
          const currentPct = parseFloat(String(invoice.insurance_coverage_percentage)) || 0;
          const match = cats.find((c: any) => parseFloat(c.coverage_percentage) === currentPct);
          if (match) setSelectedCategory(String(match.id));
        }
      } catch { /* non-fatal */ }
    }

    // Fetch existing items for this invoice
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`);
      if (res.ok) {
        const data = await res.json();
        const items = data.data?.items || data.items || [];
        
        if (items.length > 0) {
          const mapped: LineItem[] = items.map((item: any) => {
            // Try to match back to a service by service_id or name
            const svc = services.find(
              s => s.id === item.item_code || s.name_ar === item.item_name_ar || s.name === item.item_name
            );

            // Use the service UUID if found, otherwise use item_code
            const serviceId = svc?.id || item.item_code || '';


            // Lines pulled via "🩺 Get Orders" (openehr_source_uid set) never had a
            // catalog service — they're procedures/labs synthesized from OpenEHR
            // with no service_id. Render those read-only (like on create) instead
            // of a services <select> that can never show the right option.
            const isFromOpenEHR = !!item.openehr_source_uid || !!item.openehr_order_id;

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
              stakeholder_id: item.stakeholder_id || undefined,
              fromOpenEHR: isFromOpenEHR,
              openehr_source_uid: item.openehr_source_uid || undefined,
              openehr_order_id: item.openehr_order_id || undefined,
            };
          });
          setLineItems(mapped);
        }
      } else {
        // Was silent. The form opened with no lines, which reads as an invoice
        // that has none rather than one whose lines failed to load.
        toast.error('Could not load the lines on this invoice.');
      }
    } catch (error) {
      console.error('Failed to load invoice items:', error);
      toast.error('Could not load the lines on this invoice.');
    }
  };

  // Line item helpers
  const addLineItem = () => {
    setLineItems(prev => [...prev, { service_id: '', service_code: '', service_name: '', service_name_ar: '', service_category: '', quantity: 1, unit_price: 0, discount_percentage: 0, line_total: 0 }]);
  };

  const updateLineService = (idx: number, serviceId: string) => {
    const svc = services.find(s => s.id === serviceId);
    if (!svc) return;
    const updated = [...lineItems];
    const price = svc.price_self_pay;
    updated[idx] = { service_id: svc.id, service_code: svc.code, service_name: svc.name, service_name_ar: svc.name_ar, service_category: svc.category, quantity: 1, unit_price: price, discount_percentage: 0, line_total: price, provider_id: svc.provider_id, provider_name: svc.provider_name, service_fee: svc.service_fee };
    setLineItems(updated);
    recalcFromLines(updated, formData.insurance_coverage_percentage || 0);
  };


  const updateLinePrice = (idx: number, price: number) => {
    const updated = [...lineItems];
    const disc = updated[idx].discount_percentage || 0;
    const lineTotal = price - Math.round(price * disc / 100);
    updated[idx] = { ...updated[idx], unit_price: price, line_total: lineTotal };
    setLineItems(updated);
    recalcFromLines(updated, formData.insurance_coverage_percentage || 0);
  };

  const updateLineDiscount = (idx: number, discPct: number) => {
    const updated = [...lineItems];
    const price = updated[idx].unit_price || 0;
    const lineTotal = price - Math.round(price * discPct / 100);
    updated[idx] = { ...updated[idx], discount_percentage: discPct, line_total: lineTotal };
    setLineItems(updated);
    recalcFromLines(updated, formData.insurance_coverage_percentage || 0);
  };

  const removeLineItem = (idx: number) => {
    const updated = lineItems.filter((_, i) => i !== idx);
    setLineItems(updated);
    recalcFromLines(updated, formData.insurance_coverage_percentage || 0);
  };

  const updateLineProvider = (idx: number, stakeholderId: string) => {
    const updated = [...lineItems];
    updated[idx] = { ...updated[idx], stakeholder_id: stakeholderId || undefined };
    setLineItems(updated);
  };

  // Remove every line belonging to one pulled OpenEHR order at once (e.g. a
  // 50+ test lab order) instead of deleting each test line individually.
  // The order then reappears in the "Matched OpenEHR Orders" list to re-add.
  const removeOrderGroup = (group: string) => {
    const updated = lineItems.filter(l => l.orderGroup !== group);
    setLineItems(updated);
    recalcFromLines(updated, formData.insurance_coverage_percentage || 0);
  };

  const recalcFromLines = (lines: LineItem[], insPct: number) => {
    const grossSubtotal = lines.reduce((s, l) => s + (Number(l.unit_price) || 0), 0);
    const totalDiscount = lines.reduce((s, l) => s + Math.round((Number(l.unit_price) || 0) * (l.discount_percentage || 0) / 100), 0);
    const subtotal = grossSubtotal - totalDiscount;
    const insuranceCoverage = Math.round(subtotal * insPct / 100);
    const patientResp = subtotal - insuranceCoverage;
    setFormData(prev => ({
      ...prev,
      subtotal: grossSubtotal,
      discount_percentage: grossSubtotal > 0 ? Math.round(totalDiscount / grossSubtotal * 10000) / 100 : 0,
      discount_amount: totalDiscount,
      total_amount: subtotal,
      insurance_coverage_amount: insuranceCoverage,
      patient_responsibility: patientResp,
      balance_due: patientResp - (prev.amount_paid || 0),
    }));
  };

  const handleInsurancePctChange = (insPct: number) => {
    setFormData(prev => ({ ...prev, insurance_coverage_percentage: insPct }));
    recalcFromLines(lineItems, insPct);
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
      } else {
        // Was silent: the request failed and nothing on screen said so.
        const problem = await res.json().catch(() => null);
        toast.error(problem?.error || 'Could not search patients');
      }
    } catch (error) {
      console.error('Patient search error from Tibbna OpenEHR DB:', error);
    }
  };

  const selectPatient = async (patient: any) => {
    const patientId = patient.id || patient.patient_id;

    // Switching patient mid-invoice would otherwise leave the previous
    // patient's pulled OpenEHR services (and any manually added lines)
    // attached to whoever gets selected next — confirm before discarding.
    if (patientId !== formData.patient_id && (lineItems.length > 0 || openEhrCandidates.length > 0)) {
      const ok = window.confirm(
        'Switching patients will clear the services already added to this invoice. Continue?'
      );
      if (!ok) return;
    }

    let autoInsCompanyId = patient.insuranceCompany?.id || patient.insurance_provider_id || '';
    let autoInsPct = 0;

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
      insurance_coverage_amount: 0,
      subtotal: 0,
      discount_amount: 0,
      total_amount: 0,
      patient_responsibility: 0,
      balance_due: 0,
    }));
    setLineItems([]);
    setOpenEhrCandidates([]);
    setCollapsedGroups(new Set());
    setInsuranceCategories([]);
    setSelectedCategory('');
    setPatientSearch(patient.fullNameAr || patient.fullNameEn || patient.full_name_ar || patient.full_name);
    setShowPatientDropdown(false);
    setPatientResults([]);

    // Capture the patient's national ID; orders are only fetched once the user sets
    // filter criteria (date/order id/skip-paid) and clicks "Pull from OpenEHR".
    const nid = patient.nationalid || patient.national_id || '';
    setPatientNationalId(nid);
  };

  // Pull the patient's lab/surgery/medication orders from OpenEHR into invoice lines.
  // The group key an order's line(s) are filed under in the invoice — used both
  // to build lines and to detect whether an order has already been added.
  const orderGroupOf = (o: any) => {
    const dt = (d?: string) => (d ? ' · ' + new Date(d).toLocaleDateString('en-GB') : '');
    if (o.order_type === 'LAB') return `🧪 Lab Order · ${o.order_id || o.name}${dt(o.requested_date)}`;
    if (o.order_type === 'PROCEDURE') return `🔪 Surgery · ${o.name}${dt(o.requested_date)}`;
    if (o.order_type === 'VACCINATION') return `💉 Vaccination · ${o.name}${dt(o.requested_date)}`;
    if (o.order_type === 'MEDICATION') return '💊 Medications';
    if (o.order_type === 'ER') return `🚑 Emergency Room${dt(o.requested_date)}`;
    return `Order · ${o.name}${dt(o.requested_date)}`;
  };

  // Convert OpenEHR orders into invoice lines: lab orders expand into one line
  // per test (grouped under the order), procedures/meds become one line each.
  const buildOpenEHRLines = (items: any[]): LineItem[] => {
    const lines: LineItem[] = [];
    for (const o of items) {
      const grp = orderGroupOf(o);
      if (o.order_type === 'LAB' && Array.isArray(o.tests) && o.tests.length > 0) {
        for (const t of o.tests) {
          lines.push({
            service_id: t.service_id || '', service_code: t.service_code || '',
            service_name: t.name, service_name_ar: '', service_category: 'LAB',
            quantity: 1, unit_price: Number(t.price) || 0, discount_percentage: 0,
            line_total: Number(t.price) || 0, fromOpenEHR: true, orderGroup: grp,
            openehr_source_uid: o.source_uid, openehr_order_id: o.order_id,
          });
        }
      } else {
        lines.push({
          service_id: o.service_id || '', service_code: o.service_code || '',
          service_name: o.order_type === 'ER' ? o.name : `${o.name}${o.order_type ? ` (${o.order_type})` : ''}`,
          service_name_ar: (o.description || '').slice(0, 140), service_category: o.order_type || '',
          quantity: 1, unit_price: Number(o.price) || 0, discount_percentage: 0,
          line_total: Number(o.price) || 0, fromOpenEHR: true, orderGroup: grp,
          openehr_source_uid: o.source_uid, openehr_order_id: o.order_id,
        });
      }
    }
    return lines;
  };

  // Fetch matching OpenEHR orders for review — nothing is added to the invoice
  // yet; the user picks which ones to add via the "+" button per order.
  const pullOpenEHROrders = async (nationalIdOverride?: string, silent = false) => {
    const nid = nationalIdOverride || patientNationalId;
    if (!nid) { if (!silent) toast.error('Select a patient with a national ID first'); return; }
    setPullingOrders(true);
    try {
      const qs = new URLSearchParams({ subject: nid });
      if (pullDateFrom) qs.set('date_from', pullDateFrom);
      if (pullDateTo) qs.set('date_to', pullDateTo);
      if (pullOrderId.trim()) qs.set('order_id', pullOrderId.trim());
      qs.set('skip_paid', String(pullSkipPaid));
      const res = await fetch(`/api/openehr/patient-orders?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch OpenEHR orders');
      const items: any[] = data.items || [];
      setOpenEhrCandidates(items);
      if (items.length === 0) {
        if (!silent) toast.info(data.note || 'No clinical orders matched your filters for this patient');
        return;
      }
      if (!silent) toast.success(`Found ${items.length} order(s) — click + to add each to the invoice`);
    } catch (e: any) {
      if (!silent) toast.error('OpenEHR: ' + e.message);
    } finally {
      setPullingOrders(false);
    }
  };

  // Add a single matched OpenEHR order to the invoice's line items and totals.
  const addOrderToInvoice = (o: any) => {
    const grp = orderGroupOf(o);
    const newLines = buildOpenEHRLines([o]);
    const kept = lineItems.filter(l => l.orderGroup !== grp);
    const updated = [...kept, ...newLines];
    setLineItems(updated);
    recalcFromLines(updated, formData.insurance_coverage_percentage || 0);
    setCollapsedGroups(prev => new Set(prev).add(grp));
    toast.success(`Added "${o.order_id || o.name}" to the invoice`);
  };

  // Download the Insurance Pre-Approval Request Report as a .docx (auto-filled
  // from patient/insurance/cost data; clinical & policy fields print blank for
  // manual completion, matching the hospital's standard PA request template).
  const downloadInsurancePreApproval = async (inv: Invoice) => {
    try {
      toast.info('Generating insurance pre-approval report…');
      const res = await fetch(`/api/invoices/${inv.id}/insurance-report/docx`);
      if (!res.ok) throw new Error('Failed to generate report');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Insurance_PreApproval_${inv.invoice_number}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('downloadInsurancePreApproval error:', err);
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
        invoice_number: editingInvoice ? formData.invoice_number : generatedInvoiceNumber,
        // Payment date is no longer picked manually — it's captured automatically
        // as today's date the moment the invoice is saved.
        payment_date: formData.payment_date || new Date().toISOString().split('T')[0],
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
          stakeholder_id: l.stakeholder_id || null,
          openehr_source_uid: l.openehr_source_uid || null,
          openehr_order_id: l.openehr_order_id || null,
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
      {!showModal && (
      <>
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
                            const r = await fetch(`/api/invoices/${inv.id}`);
                            if (r.ok) { 
                              const d = await r.json(); 
                              const items = d.data?.items || d.items || [];
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
                      {/* Submit Insurance Claim — only while there's no claim already
                          in flight/decided for this invoice; once one exists, claim
                          progress is tracked and actioned from the Insurance Claims
                          page instead (resubmission included). */}
                      {inv.insurance_coverage_amount > 0 && inv.status !== 'CANCELLED' &&
                        !inv.latest_claim_status && (
                        <button
                          onClick={() => { setClaimInvoice(inv); setClaimNotes(''); }}
                          className="p-1 hover:bg-blue-50 rounded"
                          title="Submit Insurance Claim"
                        >
                          <Shield className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {inv.latest_claim_status === 'APPROVED' && (
                        <span
                          className="p-1 text-emerald-600"
                          title="Insurance claim approved"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </span>
                      )}
                      {/* Pre-approval requests are typically submitted before coverage is
                          determined, so this only needs an insurance company on file —
                          not a nonzero coverage amount. */}
                      {inv.insurance_company_id && (
                        <button
                          onClick={() => downloadInsurancePreApproval(inv)}
                          className="p-1 hover:bg-purple-50 rounded"
                          title="Download Insurance Pre-Approval Report (DOCX)"
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
      </>
      )}

      {/* Create/Edit — shown inline in place of the list, not as a floating modal */}
      {showModal && (
        <div className="bg-white rounded-xl border">
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="text-blue-600 mt-0.5">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-blue-900">Invoice Number</div>
                          <div className="text-xs text-blue-700 mt-0.5 font-mono">{generatedInvoiceNumber}</div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <div className="text-blue-600 mt-0.5">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-blue-900">Invoice Date</div>
                          <div className="text-xs text-blue-700 mt-0.5">{formData.invoice_date || new Date().toISOString().split('T')[0]}</div>
                        </div>
                      </div>
                    </div>
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => pullOpenEHROrders()}
                      disabled={pullingOrders || !patientNationalId}
                      title={patientNationalId ? "Load this patient's lab/surgery/medication orders from OpenEHR" : 'Select a patient first'}
                      className="flex items-center gap-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      🩺 {pullingOrders ? 'Loading…' : 'Get Orders'}
                    </button>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="flex items-center gap-1 text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600"
                    >
                      <Plus className="w-3 h-3" /> Add Service
                    </button>
                  </div>
                </div>

                {patientNationalId && (
                  <div className="flex flex-wrap items-end gap-2 mb-3 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-0.5">From</label>
                      <input type="date" value={pullDateFrom} onChange={e => setPullDateFrom(e.target.value)}
                        className="border rounded px-2 py-1 text-xs" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-0.5">To</label>
                      <input type="date" value={pullDateTo} onChange={e => setPullDateTo(e.target.value)}
                        className="border rounded px-2 py-1 text-xs" />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-500 block mb-0.5">Order ID</label>
                      <input type="text" value={pullOrderId} onChange={e => setPullOrderId(e.target.value)}
                        placeholder="e.g. OrderId-178..." className="border rounded px-2 py-1 text-xs w-40" />
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-700 pb-1.5">
                      <input type="checkbox" checked={pullSkipPaid} onChange={e => setPullSkipPaid(e.target.checked)} />
                      Skip orders already paid on another invoice
                    </label>
                  </div>
                )}

                {(() => {
                  // Once an order is added to the invoice it disappears from this list —
                  // it now lives only as an editable/removable line item below (no duplication).
                  const pendingCandidates = openEhrCandidates.filter(
                    o => !lineItems.some(l => l.orderGroup === orderGroupOf(o))
                  );
                  if (pendingCandidates.length === 0) return null;
                  return (
                    <div className="mb-3 border border-emerald-200 rounded-lg overflow-hidden">
                      <div className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 flex items-center justify-between">
                        <span>🩺 Matched OpenEHR Orders ({pendingCandidates.length}) — click + to add to invoice</span>
                        <button type="button" onClick={() => setOpenEhrCandidates([])} className="text-emerald-100 hover:text-white text-[11px] underline">
                          Clear
                        </button>
                      </div>
                      <div className="divide-y divide-emerald-100 max-h-64 overflow-y-auto bg-white">
                        {pendingCandidates.map((o, i) => {
                          const itemCount = o.order_type === 'LAB' && Array.isArray(o.tests) ? o.tests.length : 1;
                          const total = o.order_type === 'LAB' && Array.isArray(o.tests)
                            ? o.tests.reduce((s: number, t: any) => s + (Number(t.price) || 0), 0)
                            : Number(o.price) || 0;
                          const icon = o.order_type === 'PROCEDURE' ? '🔪' : o.order_type === 'VACCINATION' ? '💉' : o.order_type === 'MEDICATION' ? '💊' : o.order_type === 'ER' ? '🚑' : '🧪';
                          return (
                            <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                              <div className="min-w-0">
                                <div className="font-medium text-gray-800 truncate">
                                  {icon} {o.order_id || o.name}
                                  {o.requested_date && <span className="text-gray-400 font-normal"> · {new Date(o.requested_date).toLocaleDateString('en-GB')}</span>}
                                </div>
                                <div className="text-gray-400">
                                  {itemCount} item{itemCount > 1 ? 's' : ''} · {fmt(total)} IQD
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => addOrderToInvoice(o)}
                                title="Add this order to the invoice"
                                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition bg-emerald-500 text-white hover:bg-emerald-600 hover:scale-105"
                              >
                                +
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-3">
                  {lineItems.map((line, idx) => {
                    const showGroup = !!line.orderGroup && (idx === 0 || lineItems[idx - 1].orderGroup !== line.orderGroup);
                    const collapsed = !!line.orderGroup && collapsedGroups.has(line.orderGroup);
                    const groupLines = line.orderGroup ? lineItems.filter(l => l.orderGroup === line.orderGroup) : [];
                    const groupTotal = groupLines.reduce((s, l) => s + (Number(l.line_total) || 0), 0);
                    return (
                    <div key={idx}>
                     {showGroup && line.orderGroup && (
                       <div className="w-full mt-2 mb-1 px-3 py-2 bg-indigo-50 border-l-4 border-indigo-400 rounded flex items-center justify-between hover:bg-indigo-100 transition">
                         <button
                           type="button"
                           onClick={() => toggleGroup(line.orderGroup!)}
                           className="flex-1 flex items-center justify-between text-left"
                         >
                           <span className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
                             <span className="text-[10px]">{collapsed ? '▶' : '▼'}</span> {line.orderGroup}
                             <span className="text-indigo-400 font-normal">({groupLines.length} item{groupLines.length !== 1 ? 's' : ''})</span>
                           </span>
                           <span className="text-xs font-bold text-indigo-900 mr-2">{fmt(groupTotal)} IQD</span>
                         </button>
                         {line.fromOpenEHR && (
                           <button
                             type="button"
                             onClick={() => removeOrderGroup(line.orderGroup!)}
                             className="p-1 text-red-500 hover:bg-red-100 rounded transition shrink-0"
                             title="Remove this whole order from the invoice"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                         )}
                       </div>
                     )}
                     {!collapsed && (
                     <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                     <div className="grid grid-cols-12 gap-3 items-end">
                      {/* Service selector */}
                      <div className="col-span-5">
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Service</label>
                        {/* Pulled-from-OpenEHR line: show its name + detail, dropdown becomes optional catalog mapping */}
                        {line.fromOpenEHR ? (
                          <div className="border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-1.5">🩺 {line.service_name}</div>
                            {line.service_name_ar && <div className="text-[11px] text-gray-500 truncate">{line.service_name_ar}</div>}
                          </div>
                        ) : (
                          <select
                            value={line.service_id}
                            onChange={e => updateLineService(idx, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          >
                            <option value="">Select service...</option>
                            {services.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} - {s.name_ar}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      {/* Unit price */}
                      <div className="col-span-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Price (IQD)</label>
                        <input
                          type="number"
                          min="0"
                          value={Number(line.unit_price) || 0}
                          onChange={e => updateLinePrice(idx, parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                      </div>
                      {/* Discount % */}
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1.5">Disc %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={line.discount_percentage || ''}
                          onChange={e => updateLineDiscount(idx, parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="0"
                        />
                      </div>
                      {/* Net + remove */}
                      <div className="col-span-2 flex items-end gap-1">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1.5">Net</label>
                          <div className="px-2 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 text-center">
                            {fmt(line.line_total)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLineItem(idx)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                          title="Remove service"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                     </div>

                      {/* Physician picker for OpenEHR-pulled lines — these have no
                          catalog service, so there's no per-service provider list to
                          draw from; offer the full active stakeholder roster instead.
                          Optional: the pre-approval report just shows it blank if unset. */}
                      {line.fromOpenEHR && (
                        <div className="flex items-center gap-2 mt-2">
                          <label className="text-xs text-gray-500 whitespace-nowrap">👤 Physician:</label>
                          <select
                            value={line.stakeholder_id || ''}
                            onChange={e => updateLineProvider(idx, e.target.value)}
                            className="flex-1 border rounded-lg px-2 py-1.5 text-xs bg-white"
                          >
                            <option value="">— Not specified —</option>
                            {allStakeholders.map(s => (
                              <option key={s.stakeholder_id} value={s.stakeholder_id}>
                                {s.name_en || s.name_ar}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                    )}
                    </div>
                    );
                  })}
                </div>

                {lineItems.length > 0 && (
                  <div className="mt-2 flex justify-end text-sm font-medium text-gray-700 bg-blue-50 rounded-lg px-4 py-2">
                    Services Total: <span className="ml-2 font-bold text-gray-900">{fmt(formData.total_amount || 0)} IQD</span>
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
                      readOnly
                      value={Number(formData.subtotal) || 0}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">Before discounts</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Discount (IQD)</label>
                    <input
                      type="number"
                      readOnly
                      value={Number(formData.discount_amount) || 0}
                      className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">Per-service discounts</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Total Amount (IQD)</label>
                    <input
                      type="number"
                      readOnly
                      value={Number(formData.total_amount) || 0}
                      className="w-full px-3 py-2 border rounded-lg text-sm font-bold bg-gray-50 text-gray-900 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">After discounts</p>
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
                      onChange={e => {
                        const companyId = e.target.value || '';
                        setFormData({ ...formData, insurance_company_id: companyId });
                        setSelectedCategory('');
                        if (companyId) {
                          fetch(`/api/insurance-companies/${companyId}/categories`)
                            .then(r => r.json())
                            .then(d => setInsuranceCategories(d.data || []))
                            .catch(() => setInsuranceCategories([]));
                        } else {
                          setInsuranceCategories([]);
                          handleInsurancePctChange(0);
                        }
                      }}
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
                  {formData.insurance_company_id && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Insurance Category *</label>
                      {insuranceCategories.length > 0 ? (
                        <select
                          value={selectedCategory}
                          onChange={e => {
                            const catId = e.target.value;
                            setSelectedCategory(catId);
                            if (catId) {
                              const cat = insuranceCategories.find(c => String(c.id) === catId);
                              if (cat) handleInsurancePctChange(cat.coverage_percentage);
                            } else {
                              handleInsurancePctChange(0);
                            }
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="">Select category...</option>
                          {insuranceCategories.map(cat => (
                            <option key={cat.id} value={String(cat.id)}>
                              {cat.category_name} - {cat.coverage_percentage}%
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-xs text-gray-400 py-2">No categories defined for this company.</p>
                      )}
                    </div>
                  )}
                  {formData.insurance_company_id && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Coverage %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        readOnly
                        value={Number(formData.insurance_coverage_percentage) || 0}
                        className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 cursor-not-allowed"
                      />
                      <p className="text-xs text-gray-400 mt-0.5">Set by selected category</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Coverage Amount (IQD)</label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      readOnly={lineItems.length > 0}
                      value={Number(formData.insurance_coverage_amount) || 0}
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
                      value={Number(formData.patient_responsibility) || 0}
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
                      value={Number(formData.amount_paid) || 0}
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
                      value={Number(formData.balance_due) || 0}
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
