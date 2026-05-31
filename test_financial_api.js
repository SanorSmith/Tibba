const http = require('http');

function testFinancialAPI() {
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
        console.log('=== FINANCIAL API TEST RESULTS ===');
        console.log('Status:', res.statusCode);
        console.log('Success:', result.success);
        
        if (result.success && result.data && result.data.revenue) {
          console.log('\n📊 Revenue Breakdown:');
          result.data.revenue.breakdown.forEach((item, index) => {
            console.log(`${index + 1}. Category: ${item.category}`);
            console.log(`   Label: ${item.category_label || 'NOT FOUND'}`);
            console.log(`   Display: ${item.display_name || 'NOT FOUND'}`);
            console.log(`   Revenue: ${item.revenue} IQD`);
            console.log('');
          });
          
          console.log('✅ Label Mapping Status:', result.data.metadata?.hasLabelMapping ? 'WORKING' : 'NOT WORKING');
          console.log('✅ Using Fallback Data:', result.data.metadata?.usingFallbackData ? 'YES' : 'NO');
        } else {
          console.log('❌ Invalid API response structure');
        }
      } catch (error) {
        console.error('❌ Error parsing JSON:', error.message);
        console.log('Raw response:', data.substring(0, 500));
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ API Request Error:', error.message);
    console.log('Make sure your Next.js server is running on http://localhost:3000');
  });

  req.end();
}

testFinancialAPI();
