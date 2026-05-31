// Test API using curl-like fetch
async function testAPIWithFetch() {
  console.log('🔍 TESTING API WITH FETCH');
  console.log('===========================');

  try {
    const invoiceId = 'aba3e509-0a82-490e-9d11-79bd03f082d5';
    
    const response = await fetch(`http://localhost:3001/api/invoices/${invoiceId}`, {
      headers: {
        'Accept': 'application/json',
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response text length:', text.length);
    console.log('Response preview:', text.substring(0, 500));

    try {
      const data = JSON.parse(text);
      console.log('\n✅ Parsed JSON:');
      console.log('- success:', data.success);
      console.log('- data.id:', data.data?.id);
      console.log('- data.invoice_number:', data.data?.invoice_number);
      console.log('- data.total_amount:', data.data?.total_amount);
      console.log('- data.items length:', data.data?.items?.length);
      
      if (data.data?.items && data.data.items.length > 0) {
        console.log('\n✅ Items found:');
        data.data.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.item_name || item.service_name}`);
          console.log(`     Code: ${item.item_code || item.service_id}`);
          console.log(`     Qty: ${item.quantity} × ${item.unit_price} = ${item.subtotal || item.total_price}`);
        });
      } else {
        console.log('\n❌ No items found in response');
      }
    } catch (parseError) {
      console.log('❌ JSON Parse Error:', parseError.message);
      console.log('Raw response:', text);
    }

  } catch (error) {
    console.error('❌ Fetch Error:', error.message);
  }
}

testAPIWithFetch();
