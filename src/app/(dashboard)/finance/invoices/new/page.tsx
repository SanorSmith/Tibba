'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';
import Link from 'next/link';
import { financeStore } from '@/lib/financeStore';
import type { FinancePatient, MedicalService, InsuranceProvider, MedicalInvoice, InvoiceItem, InvoiceShare } from '@/types/finance';
import { toast } from 'sonner';

const fmt = (n: number) => new Intl.NumberFormat('en-IQ').format(n);

interface LineItem {
  service_id: string;
  service_name_ar: string;
  service_name_en?: string;
  service_category?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<FinancePatient[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [mounted, setMounted] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [insuranceProviderId, setInsuranceProviderId] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([]);

  useEffect(() => {
    financeStore.initialize();
    setPatients(financeStore.getPatients());
    setServices(financeStore.getMedicalServices());
    setProviders(financeStore.getInsuranceProviders());
    setMounted(true);
  }, []);

  const selectedPatient = patients.find(p => p.patient_id === patientId);
  const patientInsurances = patientId ? financeStore.getPatientInsurancesByPatient(patientId) : [];
  const selectedInsurance = patientInsurances.find(pi => pi.provider_id === insuranceProviderId);

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const discountAmount = Math.round(subtotal * discountPct / 100);
  const totalAmount = subtotal - discountAmount;
  const insurancePct = selectedInsurance?.coverage_percentage || 0;
  const insuranceCoverage = Math.round(totalAmount * insurancePct / 100);
  const patientResponsibility = totalAmount - insuranceCoverage;

  const addLine = () => {
    setLines([...lines, { service_id: '', service_name_ar: '', quantity: 1, unit_price: 0, line_total: 0 }]);
  };

  const updateLine = (idx: number, serviceId: string) => {
    const svc = services.find(s => s.service_id === serviceId);
    if (!svc) return;
    const updated = [...lines];
    updated[idx] = {
      service_id: svc.service_id,
      service_name_ar: svc.service_name_ar,
      service_name_en: svc.service_name_en,
      service_category: svc.service_category,
      quantity: updated[idx].quantity || 1,
      unit_price: svc.base_price,
      line_total: svc.base_price * (updated[idx].quantity || 1),
    };
    setLines(updated);
  };

  const updateQty = (idx: number, qty: number) => {
    const updated = [...lines];
    updated[idx].quantity = qty;
    updated[idx].line_total = updated[idx].unit_price * qty;
    setLines(updated);
  };

  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!patientId) { toast.error('Select a patient'); return; }
    if (lines.length === 0) { toast.error('Add at least one service'); return; }
    if (lines.some(l => !l.service_id)) { toast.error('Select a service for each line'); return; }

    const invoiceId = `inv-${Date.now()}`;
    const existingInvoices = financeStore.getInvoices();
    const nextNum = String(existingInvoices.length + 1).padStart(5, '0');

    const invoice: MedicalInvoice = {
      invoice_id: invoiceId,
      invoice_number: `INV-2024-${nextNum}`,
      invoice_date: new Date().toISOString().split('T')[0],
      patient_id: patientId,
      patient_name_ar: selectedPatient?.full_name_ar || '',
      subtotal,
      discount_percentage: discountPct,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      insurance_provider_id: insuranceProviderId || undefined,
      insurance_coverage_amount: insuranceCoverage,
      insurance_coverage_percentage: insurancePct,
      patient_responsibility: patientResponsibility,
      status: 'PENDING',
      amount_paid: 0,
      balance_due: patientResponsibility,
      payment_method: paymentMethod,
      notes: notes || undefined,
      created_at: new Date().toISOString(),
      created_by: 'user_001',
    };

    const invoiceItems: InvoiceItem[] = lines.map((l, i) => ({
      item_id: `ii-${Date.now()}-${i}`,
      invoice_id: invoiceId,
      service_id: l.service_id,
      service_name_ar: l.service_name_ar,
      service_name_en: l.service_name_en,
      service_category: l.service_category as InvoiceItem['service_category'],
      quantity: l.quantity,
      unit_price: l.unit_price,
      line_total: l.line_total,
    }));

    // Auto-generate shares from templates
    const allShares: InvoiceShare[] = [];
    lines.forEach((l, i) => {
      const templates = financeStore.getTemplatesByService(l.service_id);
      templates.forEach(tpl => {
        const stakeholder = financeStore.getStakeholder(tpl.stakeholder_id);
        if (!stakeholder) return;
        const shareAmount = tpl.share_type === 'PERCENTAGE' ? Math.round(l.line_total * (tpl.share_percentage || 0) / 100) : (tpl.share_amount || 0);
        allShares.push({
          share_id: `is-${Date.now()}-${i}-${tpl.template_id}`,
          invoice_id: invoiceId,
          invoice_item_id: invoiceItems[i].item_id,
          stakeholder_id: tpl.stakeholder_id,
          stakeholder_name_ar: stakeholder.name_ar,
          stakeholder_role: stakeholder.role,
          share_type: tpl.share_type,
          share_percentage: tpl.share_percentage,
          share_amount: shareAmount,
          payment_status: 'PENDING',
          amount_paid: 0,
        });
      });
    });

    financeStore.addInvoice(invoice);
    financeStore.addInvoiceItems(invoiceItems);
    if (allShares.length > 0) financeStore.addInvoiceShares(allShares);

    toast.success(`Invoice ${invoice.invoice_number} created`);
    router.push('/finance/invoices');
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/finance/invoices" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900">New Invoice</h1><p className="text-gray-500 text-sm">Create a new medical invoice</p></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Patient Selection */}
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold text-sm">Patient Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Patient *</label>
                <select value={patientId} onChange={e => { setPatientId(e.target.value); setInsuranceProviderId(''); }} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.full_name_ar} ({p.patient_number})</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Insurance Provider</label>
                <select value={insuranceProviderId} onChange={e => setInsuranceProviderId(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" disabled={!patientId || patientInsurances.length === 0}>
                  <option value="">No insurance</option>
                  {patientInsurances.map(pi => {
                    const prov = providers.find(p => p.provider_id === pi.provider_id);
                    return <option key={pi.insurance_id} value={pi.provider_id}>{prov?.provider_name_ar || pi.provider_id} ({pi.coverage_percentage}%)</option>;
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Services</h2>
              <button onClick={addLine} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-700"><Plus size={12} /> Add Service</button>
            </div>
            {lines.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No services added yet</p>}
            {lines.map((line, idx) => (
              <div key={idx} className="flex gap-3 items-end border-b pb-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 block mb-1">Service</label>
                  <select value={line.service_id} onChange={e => updateLine(idx, e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select service...</option>
                    {services.map(s => <option key={s.service_id} value={s.service_id}>{s.service_name_ar} - {fmt(s.base_price)} IQD</option>)}
                  </select>
                </div>
                <div className="w-20">
                  <label className="text-xs text-gray-500 block mb-1">Qty</label>
                  <input type="number" min={1} value={line.quantity} onChange={e => updateQty(idx, Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="w-32 text-right">
                  <label className="text-xs text-gray-500 block mb-1">Total</label>
                  <div className="font-medium text-sm py-2">{fmt(line.line_total)} IQD</div>
                </div>
                <button onClick={() => removeLine(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          {/* Additional */}
          <div className="bg-white rounded-lg border p-4 space-y-4">
            <h2 className="font-semibold text-sm">Additional Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Discount %</label>
                <input type="number" min={0} max={100} value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)} className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border p-4 sticky top-4">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2"><Calculator size={14} /> Invoice Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{fmt(subtotal)} IQD</span></div>
              {discountPct > 0 && <div className="flex justify-between text-red-500"><span>Discount ({discountPct}%)</span><span>-{fmt(discountAmount)} IQD</span></div>}
              <div className="flex justify-between font-bold border-t pt-2"><span>Total</span><span>{fmt(totalAmount)} IQD</span></div>
              {insuranceCoverage > 0 && <div className="flex justify-between text-purple-600"><span>Insurance ({insurancePct}%)</span><span>-{fmt(insuranceCoverage)} IQD</span></div>}
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Patient Pays</span><span className="text-emerald-600">{fmt(patientResponsibility)} IQD</span></div>
            </div>
            <button onClick={handleSubmit} className="w-full mt-4 bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition">Create Invoice</button>
          </div>
        </div>
      </div>
    </div>
  );
}
