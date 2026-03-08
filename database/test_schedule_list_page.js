const http = require('http');

// Test the schedule list page to see if links are properly rendered
console.log('🧪 Testing schedule list page HTML structure...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/hr/schedules',
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
      console.log('✅ Schedule list page loads');
      
      // Look for the link structure
      const linkPattern = /href="\/hr\/schedules\/([a-f0-9-]+)"/g;
      const matches = data.match(linkPattern);
      
      if (matches && matches.length > 0) {
        console.log(`✅ Found ${matches.length} schedule links:`);
        matches.forEach((match, index) => {
          console.log(`  ${index + 1}. ${match}`);
        });
        
        // Extract the first schedule ID
        const firstId = matches[0].match(/href="\/hr\/schedules\/([a-f0-9-]+)"/)?.[1];
        if (firstId) {
          console.log(`\n🔗 First schedule ID: ${firstId}`);
          console.log(`📱 Link should be: http://localhost:3000/hr/schedules/${firstId}`);
        }
      } else {
        console.log('❌ No schedule links found in HTML');
      }
      
      // Check for Edit buttons
      if (data.includes('Edit') || data.includes('pen')) {
        console.log('✅ Edit buttons are present in HTML');
      } else {
        console.log('❌ No Edit buttons found');
      }
      
    } else {
      console.log('❌ Schedule list page failed to load');
      console.log('Response:', data.substring(0, 200));
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req.end();
