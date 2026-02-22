'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function TestInvoiceItemsPage() {
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const testInvoiceWithItems = async () => {
    setLoading(true);
    try {
      // Get OpenEHR patient
      const patientResponse = await fetch('/api/tibbna-openehr-patients');
      const patients = await patientResponse.json();
      const patientsArray = Array.isArray(patients) ? patients : (patients.data || []);
      
      if (patientsArray.length === 0) {
        throw new Error('No OpenEHR patients found');
      }
      
      const patient = patientsArray[0];
      
      // Get finance service
      const { financeStore } = await import('@/lib/financeStore');
      financeStore.initialize();
      const services = financeStore.getMedicalServices();
      
      if (services.length === 0) {
        throw new Error('No finance services found');
      }
      
      const service = services[0];
      
      // Create invoice with items
      const invoiceData = {
        invoice_number: `TEST-ITEMS-${Date.now()}`,
        invoice_date: new Date().toISOString().split('T')[0],
        patient_id: patient.patientid,
        patient_name_ar: `${patient.firstname} ${patient.lastname}`,
        patient_name: `${patient.firstname} ${patient.lastname}`,
        subtotal: service.base_price,
        discount_percentage: 0,
        discount_amount: 0,
        tax_percentage: 0,
        tax_amount: 0,
        total_amount: service.base_price,
        insurance_company_id: null,
        insurance_coverage_amount: 0,
        insurance_coverage_percentage: 0,
        patient_responsibility: service.base_price,
        amount_paid: 0,
        balance_due: service.base_price,
        status: 'PENDING',
        payment_method: null,
        notes: 'Test invoice with items',
        items: [
          {
            item_type: 'SERVICE',
            item_code: service.service_id,
            item_name: service.service_name_ar,
            item_name_ar: service.service_name_ar,
            description: service.service_category,
            quantity: 1,
            unit_price: service.base_price,
            subtotal: service.base_price,
            patient_amount: service.base_price,
          }
        ]
      };

      console.log('🧪 Testing invoice creation with items');
      console.log('📋 Invoice data:', invoiceData);
      console.log('📦 Items array:', invoiceData.items);
      console.log('📦 Items count:', invoiceData.items.length);

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (response.ok) {
        // Now check if items were actually saved
        const checkResponse = await fetch(`/api/check-invoice?invoice_number=${invoiceData.invoice_number}`);
        const checkResult = await checkResponse.json();

        setTestResults({
          success: true,
          invoice: result,
          itemsCheck: checkResult,
          itemsSaved: checkResult.itemsCount > 0,
          itemsCount: checkResult.itemsCount
        });

        if (checkResult.itemsCount > 0) {
          toast.success(`✅ Invoice created with ${checkResult.itemsCount} items!`);
        } else {
          toast.error('⚠️ Invoice created but items NOT saved!');
        }
      } else {
        setTestResults({
          success: false,
          error: result.error,
          details: result
        });
        toast.error(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setTestResults({
        success: false,
        error: error.message
      });
      toast.error(`❌ ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Test Invoice Items</h1>
        <p className="text-gray-500 text-sm">Test if invoice items are being saved to database</p>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Test Invoice Creation with Items</h2>
        <button
          onClick={testInvoiceWithItems}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Create Test Invoice with Items'}
        </button>
        
        {testResults && (
          <div className="mt-4">
            {testResults.success ? (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${testResults.itemsSaved ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`font-medium ${testResults.itemsSaved ? 'text-green-900' : 'text-red-900'}`}>
                    {testResults.itemsSaved ? '✅ SUCCESS!' : '❌ ITEMS NOT SAVED!'}
                  </div>
                  <div className={`text-sm mt-1 ${testResults.itemsSaved ? 'text-green-700' : 'text-red-700'}`}>
                    Invoice created with {testResults.itemsCount} items in database
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded">
                  <h3 className="font-medium text-sm mb-2">Invoice Details:</h3>
                  <div className="text-xs space-y-1">
                    <div><strong>Invoice Number:</strong> {testResults.invoice.invoice_number}</div>
                    <div><strong>Invoice ID:</strong> {testResults.invoice.id}</div>
                    <div><strong>Patient:</strong> {testResults.invoice.patient_name_ar}</div>
                    <div><strong>Total:</strong> {testResults.invoice.total_amount} IQD</div>
                  </div>
                </div>

                {testResults.itemsCheck && (
                  <div className="p-3 bg-gray-50 rounded">
                    <h3 className="font-medium text-sm mb-2">Items Check:</h3>
                    <div className="text-xs space-y-1">
                      <div><strong>Items in DB:</strong> {testResults.itemsCheck.itemsCount}</div>
                      {testResults.itemsCheck.items?.map((item: any, idx: number) => (
                        <div key={idx} className="mt-2 p-2 bg-white rounded">
                          <div><strong>Item:</strong> {item.item_name_ar}</div>
                          <div><strong>Quantity:</strong> {item.quantity}</div>
                          <div><strong>Price:</strong> {item.unit_price} IQD</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-red-50 rounded">
                <div className="font-medium text-red-900">❌ Test Failed</div>
                <div className="text-sm text-red-700 mt-1">
                  Error: {testResults.error}
                </div>
                {testResults.details && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs">Details</summary>
                    <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                      {JSON.stringify(testResults.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What This Test Does:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Gets a patient from OpenEHR database</li>
          <li>Gets a service from Finance store</li>
          <li>Creates invoice with items array</li>
          <li>Checks if items were saved to database</li>
          <li>Shows you exactly what happened</li>
        </ol>
        <div className="mt-3 text-sm text-blue-800">
          <strong>Check the browser console (F12)</strong> to see detailed server logs about what's happening with the items.
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-2">Next Steps:</h3>
        <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
          <li>Run this test and check if items are saved</li>
          <li>Open browser console (F12) to see server logs</li>
          <li>Look for "⚠️ No items provided" or "✅ Items array found"</li>
          <li>If items not saved, check the console logs for the reason</li>
          <li>Then use /finance/invoices/new-simple to create real invoices</li>
        </ol>
      </div>
    </div>
  );
}
