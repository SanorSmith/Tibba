'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function SimpleFinanceTestPage() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const testOpenEHRPatients = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tibbna-openehr-patients');
      const patients = await response.json();
      const patientsArray = Array.isArray(patients) ? patients : (patients.data || []);
      
      setTestResults({
        type: 'openehr',
        success: true,
        totalPatients: patientsArray.length,
        samplePatients: patientsArray.slice(0, 3)
      });

      toast.success(`✅ Found ${patientsArray.length} OpenEHR patients`);
    } catch (error: any) {
      setTestResults({
        type: 'openehr',
        success: false,
        error: error.message
      });
      toast.error(`❌ OpenEHR test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testFinanceStore = async () => {
    setLoading(true);
    try {
      const { financeStore } = await import('@/lib/financeStore');
      financeStore.initialize();
      
      const services = financeStore.getMedicalServices();
      const invoices = financeStore.getInvoices();
      
      setTestResults({
        type: 'finance',
        success: true,
        servicesCount: services.length,
        invoicesCount: invoices.length,
        sampleServices: services.slice(0, 3)
      });

      toast.success(`✅ Found ${services.length} services, ${invoices.length} invoices`);
    } catch (error: any) {
      setTestResults({
        type: 'finance',
        success: false,
        error: error.message
      });
      toast.error(`❌ Finance store test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testInvoiceCreation = async () => {
    setLoading(true);
    try {
      // Get OpenEHR patients
      const openEHRResponse = await fetch('/api/tibbna-openehr-patients');
      const openEHRPatients = await openEHRResponse.json();
      const patientsArray = Array.isArray(openEHRPatients) ? openEHRPatients : (openEHRPatients.data || []);
      
      if (patientsArray.length === 0) {
        throw new Error('No OpenEHR patients found');
      }

      // Get finance services
      const { financeStore } = await import('@/lib/financeStore');
      financeStore.initialize();
      const services = financeStore.getMedicalServices();
      
      if (services.length === 0) {
        throw new Error('No finance services found');
      }

      // Simulate invoice creation with OpenEHR patient + Finance services
      const samplePatient = patientsArray[0];
      const sampleService = services[0];
      
      const simulatedInvoice = {
        invoice_id: `test-${Date.now()}`,
        invoice_number: `TEST-${Date.now()}`,
        patient_id: samplePatient.patientid, // OpenEHR patient ID
        patient_name_ar: `${samplePatient.firstname} ${samplePatient.lastname}`,
        service_id: sampleService.service_id,
        service_name: sampleService.service_name_ar,
        total_amount: sampleService.base_price,
        created_at: new Date().toISOString()
      };

      setTestResults({
        type: 'invoice',
        success: true,
        simulatedInvoice,
        message: 'Successfully combined OpenEHR patient with Finance service'
      });

      toast.success('✅ Invoice simulation successful');
    } catch (error: any) {
      setTestResults({
        type: 'invoice',
        success: false,
        error: error.message
      });
      toast.error(`❌ Invoice test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Simple Finance Integration Test</h1>
        <p className="text-gray-500 text-sm">Test OpenEHR patients + Finance services integration</p>
      </div>

      {/* Test OpenEHR Patients */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test 1: OpenEHR Patient Data</h2>
        <button
          onClick={testOpenEHRPatients}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test OpenEHR Patients'}
        </button>
        
        {testResults?.type === 'openehr' && testResults.success && (
          <div className="mt-4">
            <div className="p-3 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">{testResults.totalPatients}</div>
              <div className="text-sm text-green-500">OpenEHR Patients Found</div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-medium text-sm mb-2">Sample Patients:</h3>
              <div className="space-y-2">
                {testResults.samplePatients.map((patient: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                    <div><strong>Patient ID:</strong> {patient.patientid}</div>
                    <div><strong>Name:</strong> {patient.firstname} {patient.lastname}</div>
                    <div><strong>Phone:</strong> {patient.phone || 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Finance Store */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test 2: Finance Services & Invoices</h2>
        <button
          onClick={testFinanceStore}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Finance Store'}
        </button>
        
        {testResults?.type === 'finance' && testResults.success && (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{testResults.servicesCount}</div>
                <div className="text-sm text-blue-500">Finance Services</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{testResults.invoicesCount}</div>
                <div className="text-sm text-green-500">Existing Invoices</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">Sample Services:</h3>
              <div className="space-y-2">
                {testResults.sampleServices.map((service: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                    <div><strong>Service:</strong> {service.service_name_ar}</div>
                    <div><strong>Price:</strong> {service.base_price} IQD</div>
                    <div><strong>Category:</strong> {service.service_category}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Invoice Creation */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test 3: Invoice Creation Simulation</h2>
        <button
          onClick={testInvoiceCreation}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Invoice Creation'}
        </button>
        
        {testResults?.type === 'invoice' && testResults.success && (
          <div className="mt-4">
            <div className="p-3 bg-green-50 rounded">
              <div className="text-sm font-medium text-green-900">{testResults.message}</div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-medium text-sm mb-2">Simulated Invoice:</h3>
              <div className="p-2 bg-gray-50 rounded text-xs">
                <div><strong>Invoice ID:</strong> {testResults.simulatedInvoice.invoice_id}</div>
                <div><strong>Patient (OpenEHR):</strong> {testResults.simulatedInvoice.patient_name_ar}</div>
                <div><strong>Patient ID:</strong> {testResults.simulatedInvoice.patient_id}</div>
                <div><strong>Service (Finance):</strong> {testResults.simulatedInvoice.service_name}</div>
                <div><strong>Amount:</strong> {testResults.simulatedInvoice.total_amount} IQD</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How This Works:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li><strong>Patient Data:</strong> Read from OpenEHR database (medical data)</li>
          <li><strong>Services Data:</strong> Read from Finance store (old database)</li>
          <li><strong>Invoice Creation:</strong> Combines OpenEHR patient + Finance service</li>
          <li><strong>Storage:</strong> Invoice saved to Finance store (old database)</li>
          <li><strong>No Patient Copying:</strong> Patients stay in OpenEHR, invoices in old database</li>
        </ol>
      </div>
    </div>
  );
}
