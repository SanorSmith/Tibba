const http = require('http');

async function testStaffAPI() {
  console.log('🔍 Testing Real Staff API');
  console.log('='.repeat(50));
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/hr/staff',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Staff API Response:');
          console.log(`- Total Staff: ${response.count}`);
          console.log('- First 3 Staff Members:');
          response.data.slice(0, 3).forEach((staff, index) => {
            console.log(`  ${index + 1}. ${staff.full_name} (${staff.id})`);
            console.log(`     Role: ${staff.role}`);
            console.log(`     Department: ${staff.department_name}`);
            console.log(`     Email: ${staff.email}`);
          });
          resolve(response);
        } catch (e) {
          console.log('❌ Raw Response:', data);
          resolve({ error: 'Failed to parse response', raw: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

testStaffAPI().catch(console.error);
