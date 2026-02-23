'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Calculator, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

interface OpenEHRPatient {
  patientid: string;
  firstname: string;
  lastname: string;
  phone?: string;
  email?: string;
  nationalid?: string;
  address?: string;
  dateofbirth?: string;
  gender?: string;
  full_name_ar?: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [patients, setPatients] = useState<OpenEHRPatient[]>([]);
  const [services, setServices] = useState<MedicalService[]>([]);
  const [providers, setProviders] = useState<InsuranceProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState<OpenEHRPatient[]>([]);
  
  // Form state
  const [patientId, setPatientId] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<OpenEHRPatient | null>(null);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [insuranceProviderId, setInsuranceProviderId] = useState('');
  const [insurancePct, setInsurancePct] = useState(0);
  const [notes, setNotes] = useState('');

  // Initialize data
  useEffect(() => {
    setMounted(true);
    financeStore.initialize();
    setServices(financeStore.getMedicalServices());
    setProviders(financeStore.getInsuranceProviders());
    loadOpenEHRPatients();
  }, []);

  // Load patients from OpenEHR database
  const loadOpenEHRPatients = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/tibbna-openehr-patients');
      if (!response.ok) {
        throw new Error('Failed to fetch OpenEHR patients');
      }
      
      const data = await response.json();
      const patientsArray = Array.isArray(data) ? data : (data.data || []);
      
      // Transform to match our interface
      const transformedPatients = patientsArray.map((patient: any) => ({
        patientid: patient.patientid,
        firstname: patient.firstname || patient.first_name_ar,
        lastname: patient.lastname || patient.last_name_ar,
        phone: patient.phone,
        email: patient.email,
        nationalid: patient.nationalid || patient.national_id,
        address: patient.address || patient.governorate,
        dateofbirth: patient.dateofbirth || patient.date_of_birth,
        gender: patient.gender,
        full_name_ar: `${patient.firstname || patient.first_name_ar} ${patient.lastname || patient.last_name_ar}`.trim()
      }));
      
      setPatients(transformedPatients);
      console.log('✅ Loaded OpenEHR patients:', transformedPatients.length);
    } catch (error: any) {
      console.error('Error loading OpenEHR patients:', error);
      toast.error('Failed to load patients from OpenEHR database');
    } finally {
      setLoading(false);
    }
  };

  // Search patients from OpenEHR database
  const searchPatients = (query: string) => {
    setPatientSearch(query);
    if (!query) {
      setFilteredPatients([]);
      setShowPatientDropdown(false);
      return;
    }

    const filtered = patients.filter(patient => 
      patient.full_name_ar?.toLowerCase().includes(query.toLowerCase()) ||
      patient.firstname?.toLowerCase().includes(query.toLowerCase()) ||
      patient.lastname?.toLowerCase().includes(query.toLowerCase()) ||
      patient.phone?.includes(query) ||
      patient.nationalid?.includes(query)
    );
    
    setFilteredPatients(filtered);
    setShowPatientDropdown(filtered.length > 0);
  };

  // Select patient from OpenEHR
  const selectPatient = (patient: OpenEHRPatient) => {
    setSelectedPatient(patient);
    setPatientId(patient.patientid);
    setPatientSearch(patient.full_name_ar || `${patient.firstname} ${patient.lastname}`);
    setShowPatientDropdown(false);
    setFilteredPatients([]);
    console.log('✅ Selected OpenEHR patient:', patient.full_name_ar);
  };

  // Calculate totals
  const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);
  const discountAmount = subtotal * (discountPct / 100);
  const afterDiscount = subtotal - discountAmount;
  const insuranceCoverage = afterDiscount * (insurancePct / 100);
  const patientResponsibility = afterDiscount - insuranceCoverage;
  const totalAmount = subtotal;

  // Add service line
  const addLine = () => {
    setLines([...lines, { 
      service_id: '', 
      service_name_ar: '', 
      quantity: 1, 
      unit_price: 0, 
      line_total: 0 
    }]);
  };

  // Update line service
  const updateLine = (idx: number, field: keyof LineItem, value: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    
    // Calculate line total
    if (field === 'quantity' || field === 'unit_price') {
      updated[idx].line_total = updated[idx].quantity * updated[idx].unit_price;
    }
    
    // Update service details
    if (field === 'service_id') {
      const service = services.find(s => s.service_id === value);
      if (service) {
        updated[idx].service_name_ar = service.service_name_ar;
        updated[idx].service_name_en = service.service_name_en;
        updated[idx].service_category = service.service_category;
        updated[idx].unit_price = service.base_price;
        updated[idx].line_total = service.base_price * updated[idx].quantity;
      }
    }
    
    setLines(updated);
  };

  // Remove line
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));

  // Create invoice in OLD database
  const handleSubmit = async () => {
    if (!selectedPatient) { toast.error('Select a patient'); return; }
    if (lines.length === 0) { toast.error('Add at least one service'); return; }
    if (lines.some(l => !l.service_id)) { toast.error('Select a service for each line'); return; }

    setLoading(true);
    try {
      // Prepare invoice data for OLD database
      const invoiceData = {
        invoice_number: `INV-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        patient_id: selectedPatient.patientid, // OpenEHR patient ID
        patient_name_ar: selectedPatient.full_name_ar || `${selectedPatient.firstname} ${selectedPatient.lastname}`,
        patient_name: selectedPatient.full_name_ar || `${selectedPatient.firstname} ${selectedPatient.lastname}`,
        subtotal,
        discount_percentage: discountPct,
        discount_amount: discountAmount,
        tax_percentage: 0,
        tax_amount: 0,
        total_amount: totalAmount,
        insurance_company_id: insuranceProviderId || null,
        insurance_coverage_amount: insuranceCoverage,
        insurance_coverage_percentage: insurancePct,
        patient_responsibility: patientResponsibility,
        amount_paid: 0,
        balance_due: patientResponsibility,
        status: 'PENDING',
        payment_method: null,
        notes,
        items: lines.map(line => ({
          item_type: 'SERVICE',
          item_code: line.service_id,
          item_name: line.service_name_ar,
          item_name_ar: line.service_name_ar,
          description: line.service_category,
          quantity: line.quantity,
          unit_price: line.unit_price,
          subtotal: line.line_total,
          patient_amount: line.line_total,
        }))
      };

      console.log('📝 Creating invoice in OLD database:', invoiceData);
      console.log('📋 Invoice payload:', JSON.stringify(invoiceData, null, 2));

      // Save to OLD database via API
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      console.log('📡 API Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Invoice saved to OLD database:', result);
        console.log('✅ Invoice ID:', result.id);
        console.log('✅ Invoice Number:', result.invoice_number);
        toast.success(`Invoice ${result.invoice_number || invoiceData.invoice_number} created successfully!`);
        router.push('/finance/invoices');
      } else {
        const error = await response.json();
        console.error('❌ Failed to save invoice to OLD database:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        toast.error(`Failed to save invoice: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      toast.error(`Error creating invoice: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="p-6"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded" /></div>;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/finance/invoices" className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-2xl font-bold text-gray-900">New Invoice</h1><p className="text-gray-500 text-sm">Create invoice with OpenEHR patient + Finance services</p></div>
      </div>

      {/* Patient Selection - OpenEHR Database */}
      <div className="bg-white rounded-lg border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Patient (OpenEHR Database)</label>
        <div className="relative">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <input
              type="text"
              value={patientSearch}
              onChange={(e) => searchPatients(e.target.value)}
              placeholder="Search patients from OpenEHR database..."
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {showPatientDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.patientid}
                  onClick={() => selectPatient(patient)}
                  className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <div className="font-medium">{patient.full_name_ar}</div>
                  <div className="text-sm text-gray-500">
                    {patient.phone} • {patient.nationalid}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {selectedPatient && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg">
            <div className="text-sm font-medium text-green-900">Selected Patient:</div>
            <div className="text-sm text-green-700">
              {selectedPatient.full_name_ar} • {selectedPatient.phone} • ID: {selectedPatient.patientid}
            </div>
          </div>
        )}
      </div>

      {/* Services - Finance Store */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Services (Finance Database)</h3>
          <button onClick={addLine} className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
            <Plus size={16} /> Add Service
          </button>
        </div>
        
        {lines.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No services added. Click "Add Service" to begin.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 border rounded-lg">
                <select
                  value={line.service_id}
                  onChange={(e) => updateLine(idx, 'service_id', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select service...</option>
                  {services.map((service) => (
                    <option key={service.service_id} value={service.service_id}>
                      {service.service_name_en || service.service_name_ar} - {service.service_name_ar}
                    </option>
                  ))}
                </select>
                
                <input
                  type="number"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-20 px-3 py-2 border rounded-lg text-center"
                  min="1"
                />
                
                <div className="w-32 text-right">
                  <div className="font-medium">{fmt(line.line_total)} IQD</div>
                </div>
                
                <button onClick={() => removeLine(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-medium text-gray-900 mb-4">Invoice Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{fmt(subtotal)} IQD</span>
          </div>
          {discountPct > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount ({discountPct}%):</span>
              <span>-{fmt(discountAmount)} IQD</span>
            </div>
          )}
          {insurancePct > 0 && (
            <div className="flex justify-between text-blue-600">
              <span>Insurance Coverage ({insurancePct}%):</span>
              <span>-{fmt(insuranceCoverage)} IQD</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Patient Responsibility:</span>
            <span>{fmt(patientResponsibility)} IQD</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={loading || !selectedPatient || lines.length === 0}
          className="flex-1 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
        >
          {loading ? 'Creating...' : 'Create Invoice (Save to Database)'}
        </button>
        <Link href="/finance/invoices" className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-center">
          Cancel
        </Link>
      </div>
    </div>
  );
}
