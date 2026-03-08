const http = require('http');

// Test if the fixed link test page loads
console.log('🧪 Testing fixed link test page...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/hr/schedules/test-link',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Link test page loads successfully!');
      
      // Check if it contains expected content
      if (data.includes('Link Test Page') && data.includes('Available Schedules')) {
        console.log('✅ Page contains expected content');
      } else {
        console.log('⚠️ Page loads but may have content issues');
      }
      
      console.log(`📄 Response length: ${data.length} characters`);
      console.log('\n🔗 You can now test the link in the browser:');
      console.log('   http://localhost:3000/hr/schedules/test-link');
      console.log('\n💡 The page should now load real schedule IDs and test different link styles!');
    } else if (res.statusCode === 307) {
      console.log('🔐 Page redirects to login (authentication required)');
      console.log('💡 This is expected - the HR routes are protected');
    } else {
      console.log('❌ Page failed to load');
      console.log('Response:', data.substring(0, 200));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
  console.log('\n💡 Make sure the dev server is running on http://localhost:3000');
});

req.end();
