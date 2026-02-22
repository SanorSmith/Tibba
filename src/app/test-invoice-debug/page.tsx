'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function InvoiceDebugPage() {
  const [loading, setLoading] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);

  const checkInvoicesAPI = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoices');
      const invoices = await response.json();
      
      setDebugResults({
        type: 'api',
        success: true,
        invoices: invoices,
        count: Array.isArray(invoices) ? invoices.length : 0,
        latest: Array.isArray(invoices) ? invoices.slice(0, 5) : []
      });

      toast.success(`✅ Found ${Array.isArray(invoices) ? invoices.length : 0} invoices`);
    } catch (error: any) {
      setDebugResults({
        type: 'api',
        success: false,
        error: error.message
      });
      toast.error(`❌ API check failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testInvoiceCreation = async () => {
    setLoading(true);
    try {
      // Get OpenEHR patients
      const patientResponse = await fetch('/api/tibbna-openehr-patients');
      const patients = await patientResponse.json();
      const patientsArray = Array.isArray(patients) ? patients : (patients.data || []);
      
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

      // Create test invoice
      const testInvoice = {
        invoice_number: `TEST-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        patient_id: patientsArray[0].patientid,
        patient_name_ar: `${patientsArray[0].firstname} ${patientsArray[0].lastname}`,
        subtotal: services[0].base_price,
        discount_percentage: 0,
        discount_amount: 0,
        tax_percentage: 0,
        tax_amount: 0,
        total_amount: services[0].base_price,
        insurance_company_id: null,
        insurance_coverage_amount: 0,
        insurance_coverage_percentage: 0,
        patient_responsibility: services[0].base_price,
        amount_paid: 0,
        balance_due: services[0].base_price,
        status: 'PENDING',
        payment_method: null,
        notes: 'Test invoice from debug page',
        items: [{
          item_type: 'SERVICE',
          item_code: services[0].service_id,
          item_name: services[0].service_name_ar,
          item_name_ar: services[0].service_name_ar,
          description: services[0].service_category,
          quantity: 1,
          unit_price: services[0].base_price,
          subtotal: services[0].base_price,
          patient_amount: services[0].base_price,
        }]
      };

      console.log('🧪 Creating test invoice:', testInvoice);

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testInvoice),
      });

      const result = await response.json();

      if (response.ok) {
        setDebugResults({
          type: 'creation',
          success: true,
          invoice: result,
          message: 'Test invoice created successfully'
        });
        toast.success('✅ Test invoice created successfully');
      } else {
        setDebugResults({
          type: 'creation',
          success: false,
          error: result.error || 'Unknown error',
          details: result
        });
        toast.error(`❌ Invoice creation failed: ${result.error}`);
      }
    } catch (error: any) {
      setDebugResults({
        type: 'creation',
        success: false,
        error: error.message
      });
      toast.error(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkLocalStorage = async () => {
    setLoading(true);
    try {
      const { financeStore } = await import('@/lib/financeStore');
      financeStore.initialize();
      
      const invoices = financeStore.getInvoices();
      const services = financeStore.getMedicalServices();
      
      setDebugResults({
        type: 'localStorage',
        success: true,
        invoices: invoices,
        services: services,
        invoicesCount: invoices.length,
        servicesCount: services.length
      });

      toast.success(`✅ Found ${invoices.length} invoices in localStorage`);
    } catch (error: any) {
      setDebugResults({
        type: 'localStorage',
        success: false,
        error: error.message
      });
      toast.error(`❌ localStorage check failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invoice Debug Page</h1>
        <p className="text-gray-500 text-sm">Debug invoice creation and storage</p>
      </div>

      {/* Check Invoices API */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Check Invoices API</h2>
        <button
          onClick={checkInvoicesAPI}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check /api/invoices'}
        </button>
        
        {debugResults?.type === 'api' && debugResults.success && (
          <div className="mt-4">
            <div className="p-3 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">{debugResults.count}</div>
              <div className="text-sm text-green-500">Invoices in Database</div>
            </div>
            
            {debugResults.latest.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-sm mb-2">Latest Invoices:</h3>
                <div className="space-y-2">
                  {debugResults.latest.map((invoice: any, idx: number) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                      <div><strong>Number:</strong> {invoice.invoice_number}</div>
                      <div><strong>Patient:</strong> {invoice.patient_name_ar}</div>
                      <div><strong>Amount:</strong> {invoice.total_amount} IQD</div>
                      <div><strong>Status:</strong> {invoice.status}</div>
                      <div><strong>Created:</strong> {new Date(invoice.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Test Invoice Creation */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test Invoice Creation</h2>
        <button
          onClick={testInvoiceCreation}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Create Test Invoice'}
        </button>
        
        {debugResults?.type === 'creation' && (
          <div className="mt-4">
            {debugResults.success ? (
              <div className="p-3 bg-green-50 rounded">
                <div className="text-sm font-medium text-green-900">{debugResults.message}</div>
                {debugResults.invoice && (
                  <div className="mt-2 text-xs text-green-800">
                    <div><strong>Invoice ID:</strong> {debugResults.invoice.id}</div>
                    <div><strong>Invoice Number:</strong> {debugResults.invoice.invoice_number}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-red-50 rounded">
                <div className="text-sm font-medium text-red-900">Creation Failed</div>
                <div className="mt-2 text-xs text-red-800">
                  <div><strong>Error:</strong> {debugResults.error}</div>
                  {debugResults.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">Details</summary>
                      <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                        {JSON.stringify(debugResults.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Check LocalStorage */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Check LocalStorage (financeStore)</h2>
        <button
          onClick={checkLocalStorage}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check LocalStorage'}
        </button>
        
        {debugResults?.type === 'localStorage' && debugResults.success && (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{debugResults.invoicesCount}</div>
                <div className="text-sm text-blue-500">Invoices in LocalStorage</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{debugResults.servicesCount}</div>
                <div className="text-sm text-green-500">Services in LocalStorage</div>
              </div>
            </div>
            
            {debugResults.invoices.length > 0 && (
              <div>
                <h3 className="font-medium text-sm mb-2">LocalStorage Invoices:</h3>
                <div className="space-y-2">
                  {debugResults.invoices.slice(0, 3).map((invoice: any, idx: number) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                      <div><strong>Number:</strong> {invoice.invoice_number}</div>
                      <div><strong>Patient:</strong> {invoice.patient_name_ar}</div>
                      <div><strong>Amount:</strong> {invoice.total_amount} IQD</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Debug Steps:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li><strong>Check API:</strong> See what's in the database via /api/invoices</li>
          <li><strong>Test Creation:</strong> Try creating a test invoice via API</li>
          <li><strong>Check LocalStorage:</strong> See what's in financeStore (old data)</li>
          <li><strong>Compare:</strong> Database vs LocalStorage to see where invoices are stored</li>
        </ol>
      </div>
    </div>
  );
}
