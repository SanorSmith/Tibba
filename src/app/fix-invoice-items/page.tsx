'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function FixInvoiceItemsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const fixInvoiceItemsTable = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fix-invoice-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok) {
        setResults(result);
        toast.success('✅ Invoice items table fixed successfully!');
      } else {
        setResults({ success: false, error: result.error });
        toast.error(`❌ Failed to fix table: ${result.error}`);
      }
    } catch (error: any) {
      setResults({ success: false, error: error.message });
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testInvoiceCreation = async () => {
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
      
      // Create test invoice
      const invoiceData = {
        invoice_number: `FIXED-TEST-${Date.now()}`,
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
        notes: 'Test after fixing invoice_items table',
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

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      if (response.ok) {
        // Check if items were saved
        const checkResponse = await fetch(`/api/check-invoice?invoice_number=${invoiceData.invoice_number}`);
        const checkResult = await checkResponse.json();

        setResults({
          success: true,
          testResult: {
            invoiceCreated: true,
            itemsSaved: checkResult.itemsCount > 0,
            itemsCount: checkResult.itemsCount,
            invoiceId: result.id,
            invoiceNumber: invoiceData.invoice_number
          }
        });

        if (checkResult.itemsCount > 0) {
          toast.success(`✅ SUCCESS! Invoice created with ${checkResult.itemsCount} items!`);
        } else {
          toast.error('⚠️ Invoice created but items still not saved');
        }
      } else {
        setResults({
          success: false,
          testResult: {
            invoiceCreated: false,
            error: result.error
          }
        });
        toast.error(`❌ Test failed: ${result.error}`);
      }
    } catch (error: any) {
      setResults({ success: false, error: error.message });
      toast.error(`❌ Test error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fix Invoice Items Table</h1>
        <p className="text-gray-500 text-sm">Fix missing columns in invoice_items table</p>
      </div>

      {/* The Problem */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h2 className="font-semibold text-red-900 mb-2">🚨 The Problem</h2>
        <div className="text-sm text-red-800">
          <p><strong>Error:</strong> "Could not find the 'payment_status' column of 'invoice_items'"</p>
          <p><strong>Cause:</strong> The invoice_items table is missing required columns</p>
          <p><strong>Solution:</strong> Add missing columns to the table</p>
        </div>
      </div>

      {/* Fix Table */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Step 1: Fix Database Table</h2>
        <button
          onClick={fixInvoiceItemsTable}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Fixing...' : 'Add Missing Columns'}
        </button>
        
        {results?.success && (
          <div className="mt-4 p-3 bg-green-50 rounded">
            <div className="text-sm font-medium text-green-900">✅ Table Fixed!</div>
            <div className="text-xs text-green-800 mt-1">
              Missing columns added to invoice_items table
            </div>
          </div>
        )}
      </div>

      {/* Test Creation */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-semibold text-lg mb-4">Step 2: Test Invoice Creation</h2>
        <button
          onClick={testInvoiceCreation}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Invoice with Items'}
        </button>
        
        {results?.testResult && (
          <div className="mt-4">
            {results.testResult.invoiceCreated && results.testResult.itemsSaved ? (
              <div className="p-3 bg-green-50 rounded">
                <div className="text-sm font-medium text-green-900">✅ SUCCESS!</div>
                <div className="text-xs text-green-800 mt-1">
                  Invoice created with {results.testResult.itemsCount} items saved
                </div>
                <div className="text-xs text-green-800 mt-1">
                  Invoice ID: {results.testResult.invoiceId}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-red-50 rounded">
                <div className="text-sm font-medium text-red-900">❌ Test Failed</div>
                <div className="text-xs text-red-800 mt-1">
                  {results.testResult.error || 'Items still not being saved'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">What This Does:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li><strong>Fix Table:</strong> Adds missing columns to invoice_items table</li>
          <li><strong>Test Creation:</strong> Creates a test invoice with items</li>
          <li><strong>Verify:</strong> Checks if items are saved to database</li>
          <li><strong>Success:</strong> Invoice creation will work properly after this</li>
        </ol>
      </div>

      {/* Raw Results */}
      {results && (
        <details className="bg-gray-50 border rounded-lg p-4">
          <summary className="font-semibold cursor-pointer">Raw Results</summary>
          <pre className="mt-4 text-xs bg-gray-100 p-3 rounded overflow-auto">
            {JSON.stringify(results, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
