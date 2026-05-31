const http = require('http');

function testCurrentAPI() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/financial-dashboard?period=month',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('=== CURRENT API RESPONSE ===');
        console.log('Success:', result.success);
        
        if (result.success && result.data?.revenue?.breakdown) {
          console.log('\n🔍 Checking last 4 revenue items:');
          const breakdown = result.data.revenue.breakdown;
          const last4 = breakdown.slice(-4);
          
          last4.forEach((item, i) => {
            console.log(`${i + 1}. Category: "${item.category}"`);
            console.log(`   Label: "${item.category_label || 'MISSING'}"`);
            console.log(`   Display: "${item.display_name || 'MISSING'}"`);
            console.log('');
          });
          
          console.log('🎯 SOLUTION:');
          console.log('If labels show "MISSING", the API is not returning label mapping');
          console.log('If labels show correctly, the browser cache is the issue');
          console.log('\n🔄 TRY: Hard refresh (Ctrl+Shift+R) or incognito window');
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request Error:', error.message);
  });

  req.end();
}

testCurrentAPI();
