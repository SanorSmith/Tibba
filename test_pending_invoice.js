// Test the specific PENDING invoice that's showing in UI
const http = require('http');

function testPendingInvoice() {
  console.log('🔍 TESTING PENDING INVOICE (INV-2026-579685)');
  console.log('=============================================');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/invoices/aba3e509-0a82-490e-9d11-79bd03f082d5', // INV-2026-579685 (PENDING)
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log('\n✅ API Response for PENDING invoice:');
        console.log('- Invoice Number:', parsed.data?.invoice_number);
        console.log('- Patient Name:', parsed.data?.patient_name);
        console.log('- Status:', parsed.data?.status);
        console.log('- Total Amount:', parsed.data?.total_amount);
        console.log('- Items Length:', parsed.data?.items?.length);
        
        if (parsed.data?.items && parsed.data.items.length > 0) {
          console.log('\n✅ Items found:');
          parsed.data.items.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.item_name}`);
            console.log(`     Code: ${item.item_code}`);
            console.log(`     Qty: ${item.quantity} × ${item.unit_price} = ${item.subtotal}`);
          });
          console.log('\n✅ This SHOULD display in frontend!');
        } else {
          console.log('\n❌ NO ITEMS IN RESPONSE - This is the problem!');
          console.log('Frontend will show: "No services recorded for this invoice."');
        }
      } catch (e) {
        console.log('❌ JSON parse error:', e.message);
        console.log('Raw response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Request error: ${e.message}`);
  });

  req.end();
}

testPendingInvoice();
