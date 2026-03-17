const http = require('http');

async function testPerformancePageStaffIntegration() {
  console.log('🔍 Testing Performance Page Staff Integration');
  console.log('='.repeat(50));
  
  // Test 1: Check if staff API works
  console.log('\n1. Testing Staff API...');
  try {
    const staffResponse = await fetch('http://localhost:3001/api/hr/staff');
    const staffData = await staffResponse.json();
    console.log(`✅ Staff API: ${staffData.count} staff members found`);
    
    if (staffData.count > 0) {
      console.log('Sample staff:');
      staffData.data.slice(0, 3).forEach((staff, index) => {
        console.log(`  ${index + 1}. ${staff.full_name} (${staff.id}) - ${staff.role}`);
      });
    }
  } catch (error) {
    console.log('❌ Staff API Error:', error.message);
  }
  
  // Test 2: Check performance page
  console.log('\n2. Testing Performance Page...');
  try {
    const perfResponse = await fetch('http://localhost:3001/hr/performance');
    const pageContent = await perfResponse.text();
    
    // Check for mock employee IDs
    const mockEmployeeIds = pageContent.match(/EMP-2024-\d+/g) || [];
    const realEmployeeIds = pageContent.match(/STAFF-[a-f0-9]+/g) || [];
    
    console.log(`Mock employee IDs found: ${mockEmployeeIds.length}`);
    console.log(`Real employee IDs found: ${realEmployeeIds.length}`);
    
    if (mockEmployeeIds.length > 0) {
      console.log('❌ Performance page still using mock data');
      console.log('Mock IDs found:', mockEmployeeIds.slice(0, 5));
    }
    
    if (realEmployeeIds.length > 0) {
      console.log('✅ Performance page using real staff data');
      console.log('Real IDs found:', realEmployeeIds.slice(0, 3));
    }
    
    // Check for specific employee names
    if (pageContent.includes('Omar Al-Bayati')) {
      console.log('❌ Still showing mock employee: Omar Al-Bayati');
    }
    
    if (pageContent.includes('ALI MOHAMED MAHMUD')) {
      console.log('✅ Showing real employee: ALI MOHAMED MAHMUD');
    }
    
  } catch (error) {
    console.log('❌ Performance Page Error:', error.message);
  }
}

// Helper function for fetch in Node.js
global.fetch = async (url) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET'
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: async () => data,
          json: async () => JSON.parse(data)
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
};

testPerformancePageStaffIntegration().catch(console.error);
