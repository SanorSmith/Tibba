// Test the invoice PUT fix
async function testInvoiceFix() {
  console.log('🧪 TESTING INVOICE PUT FIX');
  console.log('=============================');

  const invoiceId = '8fbd36ee-ad58-4830-9f9c-f1133571a14b';

  // Test data that matches what the frontend sends
  const frontendPayload = {
    invoice_number: 'INV-2024-00011',
    invoice_date: '2024-03-23',
    patient_id: '72c0c6c1-8255-42c9-852b-9dfe090345d2',
    patient_name: 'Test Patient',
    patient_name_ar: 'مريض اختبار',
    subtotal: 3000000,
    discount_percentage: 0,
    discount_amount: 0,
    total_amount: 3000000,
    insurance_company_id: null,
    insurance_coverage_amount: 0,
    insurance_coverage_percentage: 0,
    patient_responsibility: 3000000,
    amount_paid: 0,
    balance_due: 3000000,
    status: 'PENDING',
    payment_method: null,
    payment_date: null,
    notes: 'Test update from frontend simulation',
    items: [
      {
        item_type: 'SERVICE',
        item_code: 'srv-002',
        item_name: 'عملية الزائدة الدودية',
        item_name_ar: 'عملية الزائدة الدودية',
        description: 'Surgery',
        quantity: 1,
        unit_price: 3000000,
        subtotal: 3000000,
        insurance_covered: false,
        insurance_coverage_percentage: 0,
        insurance_amount: 0,
        patient_amount: 3000000,
        provider_id: null,
        provider_name: null,
        service_fee: 0,
      }
    ]
  };

  try {
    console.log('Sending frontend-style payload...');
    console.log('Items structure:', JSON.stringify(frontendPayload.items, null, 2));

    const response = await fetch(`http://localhost:3001/api/invoices/${invoiceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(frontendPayload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('✅ SUCCESS! Invoice PUT fixed');
    } else {
      console.log('❌ FAILED! Error details:', result);
    }

  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testInvoiceFix();
