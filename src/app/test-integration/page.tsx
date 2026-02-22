'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function IntegrationTestPage() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const testOpenEHRPatientSearch = async () => {
    setLoading(true);
    try {
      // Test OpenEHR patient search
      const response = await fetch('/api/tibbna-openehr-patients');
      const patients = await response.json();
      const patientsArray = Array.isArray(patients) ? patients : (patients.data || []);
      
      // Test search functionality
      const searchQuery = 'sanor';
      const filtered = patientsArray.filter((patient: any) => 
        `${patient.firstname} ${patient.lastname}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.phone?.includes(searchQuery) ||
        patient.nationalid?.includes(searchQuery)
      );
      
      setTestResults({
        type: 'openehr-search',
        success: true,
        totalPatients: patientsArray.length,
        searchQuery,
        searchResults: filtered.length,
        samplePatients: patientsArray.slice(0, 3)
      });

      toast.success(`✅ OpenEHR search: ${filtered.length} results for "${searchQuery}"`);
    } catch (error: any) {
      setTestResults({
        type: 'openehr-search',
        success: false,
        error: error.message
      });
      toast.error(`❌ OpenEHR search failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testFinanceServices = async () => {
    setLoading(true);
    try {
      // Test finance services from old database
      const { financeStore } = await import('@/lib/financeStore');
      financeStore.initialize();
      const services = financeStore.getMedicalServices();
      
      setTestResults({
        type: 'finance-services',
        success: true,
        servicesCount: services.length,
        sampleServices: services.slice(0, 3)
      });

      toast.success(`✅ Finance services: ${services.length} services available`);
    } catch (error: any) {
      setTestResults({
        type: 'finance-services',
        success: false,
        error: error.message
      });
      toast.error(`❌ Finance services failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testCompleteFlow = async () => {
    setLoading(true);
    try {
      // Step 1: Get OpenEHR patient
      const patientResponse = await fetch('/api/tibbna-openehr-patients');
      const patients = await patientResponse.json();
      const patientsArray = Array.isArray(patients) ? patients : (patients.data || []);
      
      if (patientsArray.length === 0) {
        throw new Error('No OpenEHR patients found');
      }
      
      const selectedPatient = patientsArray[0];
      
      // Step 2: Get finance service
      const { financeStore } = await import('@/lib/financeStore');
      financeStore.initialize();
      const services = financeStore.getMedicalServices();
      
      if (services.length === 0) {
        throw new Error('No finance services found');
      }
      
      const selectedService = services[0];
      
      // Step 3: Create invoice data (OpenEHR patient + Finance service)
      const invoiceData = {
        invoice_number: `TEST-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        patient_id: selectedPatient.patientid, // From OpenEHR
        patient_name_ar: `${selectedPatient.firstname} ${selectedPatient.lastname}`, // From OpenEHR
        patient_name: `${selectedPatient.firstname} ${selectedPatient.lastname}`,
        subtotal: selectedService.base_price, // From Finance
        discount_percentage: 0,
        discount_amount: 0,
        tax_percentage: 0,
        tax_amount: 0,
        total_amount: selectedService.base_price, // From Finance
        insurance_company_id: null,
        insurance_coverage_amount: 0,
        insurance_coverage_percentage: 0,
        patient_responsibility: selectedService.base_price,
        amount_paid: 0,
        balance_due: selectedService.base_price,
        status: 'PENDING',
        payment_method: null,
        notes: 'Test: OpenEHR patient + Finance service',
        items: [{
          item_type: 'SERVICE',
          item_code: selectedService.service_id, // From Finance
          item_name: selectedService.service_name_ar, // From Finance
          item_name_ar: selectedService.service_name_ar,
          description: selectedService.service_category, // From Finance
          quantity: 1,
          unit_price: selectedService.base_price, // From Finance
          subtotal: selectedService.base_price,
          patient_amount: selectedService.base_price,
        }]
      };

      console.log('🧪 Testing complete flow:', {
        patientSource: 'OpenEHR Database',
        serviceSource: 'Finance Database',
        destination: 'Old Database (via API)',
        patient: selectedPatient.firstname + ' ' + selectedPatient.lastname,
        service: selectedService.service_name_ar,
        amount: selectedService.base_price
      });

      // Step 4: Save to OLD database
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResults({
          type: 'complete-flow',
          success: true,
          flow: {
            patientSource: 'OpenEHR Database',
            serviceSource: 'Finance Database',
            destination: 'Old Database',
            patientName: `${selectedPatient.firstname} ${selectedPatient.lastname}`,
            serviceName: selectedService.service_name_ar,
            amount: selectedService.base_price,
            invoiceId: result.id,
            invoiceNumber: invoiceData.invoice_number
          }
        });
        toast.success('✅ Complete flow successful! Invoice saved to old database');
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save invoice');
      }
    } catch (error: any) {
      setTestResults({
        type: 'complete-flow',
        success: false,
        error: error.message
      });
      toast.error(`❌ Complete flow failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integration Test: OpenEHR + Finance</h1>
        <p className="text-gray-500 text-sm">Test the complete integration flow</p>
      </div>

      {/* Test OpenEHR Patient Search */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test 1: OpenEHR Patient Search</h2>
        <button
          onClick={testOpenEHRPatientSearch}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test OpenEHR Search'}
        </button>
        
        {testResults?.type === 'openehr-search' && testResults.success && (
          <div className="mt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-600">{testResults.totalPatients}</div>
                <div className="text-sm text-blue-500">Total OpenEHR Patients</div>
              </div>
              <div className="p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{testResults.searchResults}</div>
                <div className="text-sm text-green-500">Search Results for "{testResults.searchQuery}"</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">Sample OpenEHR Patients:</h3>
              <div className="space-y-2">
                {testResults.samplePatients.map((patient: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                    <div><strong>Patient ID:</strong> {patient.patientid}</div>
                    <div><strong>Name:</strong> {patient.firstname} {patient.lastname}</div>
                    <div><strong>Phone:</strong> {patient.phone || 'N/A'}</div>
                    <div><strong>Source:</strong> 🏥 OpenEHR Database</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Finance Services */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test 2: Finance Services</h2>
        <button
          onClick={testFinanceServices}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Finance Services'}
        </button>
        
        {testResults?.type === 'finance-services' && testResults.success && (
          <div className="mt-4">
            <div className="p-3 bg-green-50 rounded mb-4">
              <div className="text-2xl font-bold text-green-600">{testResults.servicesCount}</div>
              <div className="text-sm text-green-500">Finance Services Available</div>
            </div>
            
            <div>
              <h3 className="font-medium text-sm mb-2">Sample Finance Services:</h3>
              <div className="space-y-2">
                {testResults.sampleServices.map((service: any, idx: number) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded text-xs">
                    <div><strong>Service:</strong> {service.service_name_ar}</div>
                    <div><strong>Price:</strong> {service.base_price} IQD</div>
                    <div><strong>Category:</strong> {service.service_category}</div>
                    <div><strong>Source:</strong> 💰 Finance Database</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Complete Flow */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test 3: Complete Integration Flow</h2>
        <button
          onClick={testCompleteFlow}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Complete Flow'}
        </button>
        
        {testResults?.type === 'complete-flow' && (
          <div className="mt-4">
            {testResults.success ? (
              <div>
                <div className="p-3 bg-green-50 rounded mb-4">
                  <div className="text-sm font-medium text-green-900">✅ Complete Integration Successful!</div>
                  <div className="text-xs text-green-800 mt-1">
                    OpenEHR Patient + Finance Service → Old Database
                  </div>
                </div>
                
                <div className="p-3 bg-gray-50 rounded">
                  <h3 className="font-medium text-sm mb-2">Flow Details:</h3>
                  <div className="space-y-1 text-xs">
                    <div><strong>Patient Source:</strong> 🏥 OpenEHR Database</div>
                    <div><strong>Service Source:</strong> 💰 Finance Database</div>
                    <div><strong>Destination:</strong> 🗄️ Old Database (via API)</div>
                    <div><strong>Patient:</strong> {testResults.flow.patientName}</div>
                    <div><strong>Service:</strong> {testResults.flow.serviceName}</div>
                    <div><strong>Amount:</strong> {testResults.flow.amount} IQD</div>
                    <div><strong>Invoice Number:</strong> {testResults.flow.invoiceNumber}</div>
                    <div><strong>Invoice ID:</strong> {testResults.flow.invoiceId}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-50 rounded">
                <div className="text-sm font-medium text-red-900">❌ Integration Failed</div>
                <div className="text-xs text-red-800 mt-1">
                  Error: {testResults.error}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Integration Flow:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li><strong>Patient Search:</strong> Searches OpenEHR database via API</li>
          <li><strong>Service Selection:</strong> Uses Finance database (localStorage)</li>
          <li><strong>Form Data:</strong> Combines OpenEHR patient + Finance service</li>
          <li><strong>Invoice Creation:</strong> Saves to OLD database via API</li>
          <li><strong>Result:</strong> Invoice with OpenEHR patient data stored in old database</li>
        </ol>
      </div>
    </div>
  );
}
