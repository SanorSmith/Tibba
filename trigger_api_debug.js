// This will trigger the API call to see debug output
const http = require('http');

function triggerAPI() {
  console.log('🔥 TRIGGERING API CALL TO SEE DEBUG OUTPUT');
  console.log('=============================================');

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/invoices/46270afc-6a40-43ca-966e-4473e25d4e6d', // The 1,000 IQD Noor Maliki invoice
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const req = http.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      console.log(`Response length: ${data.length}`);
      console.log(`Response preview: ${data.substring(0, 500)}...`);
      
      try {
        const parsed = JSON.parse(data);
        console.log('\n✅ Parsed response:');
        console.log('- success:', parsed.success);
        console.log('- data.invoice_number:', parsed.data?.invoice_number);
        console.log('- data.patient_name:', parsed.data?.patient_name);
        console.log('- data.total_amount:', parsed.data?.total_amount);
        console.log('- data.items length:', parsed.data?.items?.length);
        
        if (parsed.data?.items && parsed.data.items.length > 0) {
          console.log('\n✅ Items in response:');
          parsed.data.items.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.item_name}`);
            console.log(`     Code: ${item.item_code}`);
            console.log(`     Qty: ${item.quantity} × ${item.unit_price} = ${item.subtotal}`);
          });
        } else {
          console.log('\n❌ No items in API response!');
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

triggerAPI();
