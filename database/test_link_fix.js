const http = require('http');

// Test if the schedule detail page loads correctly
const testScheduleId = '1650cd78-22d8-4f2b-ac58-7bd148d6591c'; // Sanor Smith's schedule

console.log('🧪 Testing if schedule detail page loads...');
console.log(`🔗 Testing URL: http://localhost:3000/hr/schedules/${testScheduleId}`);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/hr/schedules/${testScheduleId}`,
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Content-Type: ${res.headers['content-type']}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✅ Schedule detail page loads successfully!');
      
      // Check if it contains expected content
      if (data.includes('Employee Schedule Details')) {
        console.log('✅ Page contains expected content');
      } else {
        console.log('⚠️ Page loads but may have content issues');
      }
      
      console.log(`📄 Response length: ${data.length} characters`);
      console.log('\n🔗 You can now test the link in the browser:');
      console.log(`   http://localhost:3000/hr/schedules/${testScheduleId}`);
      console.log('\n💡 The "View Details" button should now be clickable!');
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
