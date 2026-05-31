// Test the live API to see if the mapping fix is working
async function testLiveAPI() {
  console.log('🔍 TESTING LIVE API');
  console.log('===================');

  try {
    // Test the Noor Maliki invoice that was showing the issue
    const invoiceId = 'aba3e509-0a82-490e-9d11-79bd03f082d5'; // One of the Noor Maliki invoices
    
    console.log(`\n1. Testing GET /api/invoices/${invoiceId}`);
    
    const response = await fetch(`http://localhost:3001/api/invoices/${invoiceId}`);
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Response structure:');
      console.log('- success:', data.success);
      console.log('- data.id:', data.data?.id);
      console.log('- data.invoice_number:', data.data?.invoice_number);
      console.log('- data.patient_name:', data.data?.patient_name);
      console.log('- data.total_amount:', data.data?.total_amount);
      console.log('- data.items length:', data.data?.items?.length);
      
      if (data.data?.items && data.data.items.length > 0) {
        console.log('\n✅ First item details:');
        const item = data.data.items[0];
        console.log('- item_code:', item.item_code);
        console.log('- item_name:', item.item_name);
        console.log('- item_name_ar:', item.item_name_ar);
        console.log('- quantity:', item.quantity);
        console.log('- unit_price:', item.unit_price);
        console.log('- subtotal:', item.subtotal);
        
        console.log('\n✅ Frontend will receive:');
        console.log('- viewItems.length =', data.data.items.length);
        console.log('- Will show services table instead of "No services"');
      } else {
        console.log('\n❌ No items in response - this is the problem!');
      }
    } else {
      const error = await response.json();
      console.log('❌ API Error:', error);
    }

    // Test another invoice to make sure
    console.log('\n2. Testing another invoice...');
    const response2 = await fetch('http://localhost:3001/api/invoices/46270afc-6a40-43ca-966e-4473e25d4e6d');
    
    if (response2.ok) {
      const data2 = await response2.json();
      console.log('Second invoice items:', data2.data?.items?.length);
      if (data2.data?.items?.length > 0) {
        console.log('Item:', data2.data.items[0].item_name);
      }
    }

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testLiveAPI();
