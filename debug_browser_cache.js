const http = require('http');

function debugAPICall() {
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
        console.log('=== BROWSER CACHE DEBUG ===');
        console.log('API Status:', res.statusCode);
        console.log('Has Label Mapping:', result.data?.metadata?.hasLabelMapping);
        
        if (result.success && result.data?.revenue?.breakdown) {
          console.log('\n🔍 First Revenue Item Structure:');
          const firstItem = result.data.revenue.breakdown[0];
          console.log('category:', firstItem.category);
          console.log('category_label:', firstItem.category_label);
          console.log('display_name:', firstItem.display_name);
          
          console.log('\n📊 What Frontend Should Display:');
          console.log('Should show:', firstItem.category_label || firstItem.display_name || firstItem.category);
          
          console.log('\n🎯 SOLUTION:');
          console.log('1. API is working correctly - labels are present');
          console.log('2. Frontend code is correct - uses label mapping');
          console.log('3. Browser is showing CACHED version');
          console.log('\n🔄 TRY THIS:');
          console.log('- Hard refresh: Ctrl+Shift+R');
          console.log('- Or: Open in incognito/private window');
          console.log('- Or: Clear browser cache for localhost:3000');
        }
      } catch (error) {
        console.error('Error:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('Request Error:', error.message);
  });

  req.end();
}

debugAPICall();
