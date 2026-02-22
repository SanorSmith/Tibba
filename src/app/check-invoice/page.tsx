'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export default function CheckInvoicePage() {
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-00012');
  const [results, setResults] = useState<any>(null);

  const checkInvoice = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/check-invoice?invoice_number=${invoiceNumber}`);
      const data = await response.json();

      if (response.ok) {
        setResults(data);
        if (data.itemsCount === 0) {
          toast.error('⚠️ Invoice found but NO ITEMS saved!');
        } else {
          toast.success(`✅ Invoice found with ${data.itemsCount} items`);
        }
      } else {
        setResults({ error: data.error, details: data.details });
        toast.error(`❌ ${data.error}`);
      }
    } catch (error: any) {
      setResults({ error: error.message });
      toast.error(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Check Invoice</h1>
        <p className="text-gray-500 text-sm">Debug invoice and items in database</p>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Number</label>
        <div className="flex gap-3">
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="INV-2026-00012"
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={checkInvoice}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Invoice'}
          </button>
        </div>
      </div>

      {results && (
        <div className="space-y-4">
          {/* Analysis */}
          {results.analysis && (
            <div className="bg-white rounded-lg border p-4">
              <h2 className="font-semibold text-lg mb-4">Analysis</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded ${results.analysis.hasInvoice ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-sm font-medium">{results.analysis.hasInvoice ? '✅' : '❌'} Invoice Found</div>
                </div>
                <div className={`p-3 rounded ${results.analysis.hasItems ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="text-sm font-medium">{results.analysis.hasItems ? '✅' : '❌'} Items Found</div>
                  <div className="text-xs text-gray-600">{results.analysis.itemsCount} items</div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Details */}
          {results.invoice && (
            <div className="bg-white rounded-lg border p-4">
              <h2 className="font-semibold text-lg mb-4">Invoice Details</h2>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-600">Invoice Number:</div>
                  <div className="font-medium">{results.invoice.invoice_number}</div>
                  
                  <div className="text-gray-600">Patient ID:</div>
                  <div className="font-medium">{results.invoice.patient_id}</div>
                  
                  <div className="text-gray-600">Patient Name:</div>
                  <div className="font-medium">{results.invoice.patient_name_ar || results.invoice.patient_name}</div>
                  
                  <div className="text-gray-600">Total Amount:</div>
                  <div className="font-medium">{results.invoice.total_amount} IQD</div>
                  
                  <div className="text-gray-600">Status:</div>
                  <div className="font-medium">{results.invoice.status}</div>
                  
                  <div className="text-gray-600">Created At:</div>
                  <div className="font-medium">{new Date(results.invoice.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice Items */}
          {results.items && (
            <div className="bg-white rounded-lg border p-4">
              <h2 className="font-semibold text-lg mb-4">Invoice Items ({results.items.length})</h2>
              
              {results.items.length === 0 ? (
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-red-900 font-medium">⚠️ NO ITEMS FOUND</div>
                  <div className="text-red-700 text-sm mt-2">
                    The invoice was created but the items were not saved to the database.
                  </div>
                  <div className="text-red-700 text-sm mt-2">
                    <strong>Possible causes:</strong>
                    <ul className="list-disc list-inside mt-1">
                      <li>Items array was empty when creating invoice</li>
                      <li>Database error when inserting items</li>
                      <li>Invoice ID mismatch between invoice and items</li>
                      <li>Items insert failed silently</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {results.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-600">Item Name:</div>
                        <div className="font-medium">{item.item_name_ar || item.item_name}</div>
                        
                        <div className="text-gray-600">Item Code:</div>
                        <div className="font-medium">{item.item_code}</div>
                        
                        <div className="text-gray-600">Quantity:</div>
                        <div className="font-medium">{item.quantity}</div>
                        
                        <div className="text-gray-600">Unit Price:</div>
                        <div className="font-medium">{item.unit_price} IQD</div>
                        
                        <div className="text-gray-600">Subtotal:</div>
                        <div className="font-medium">{item.subtotal} IQD</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Raw Data */}
          <details className="bg-white rounded-lg border p-4">
            <summary className="font-semibold cursor-pointer">Raw Data (JSON)</summary>
            <pre className="mt-4 text-xs bg-gray-50 p-3 rounded overflow-auto">
              {JSON.stringify(results, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How to Fix Missing Items:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Check if items array is being sent in the API request</li>
          <li>Verify invoice ID matches between invoice and items tables</li>
          <li>Check database logs for insert errors</li>
          <li>Ensure items have all required fields</li>
          <li>Test with the new invoice creation page: /finance/invoices/new-simple</li>
        </ol>
      </div>
    </div>
  );
}
