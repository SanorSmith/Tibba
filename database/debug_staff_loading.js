const http = require('http');

async function debugStaffLoading() {
  console.log('🔍 Debugging Staff Loading Issue');
  console.log('='.repeat(50));
  
  // Test 1: Check if StaffService API works
  console.log('\n1. Testing StaffService API...');
  try {
    const staffResponse = await fetch('http://localhost:3000/api/hr/staff');
    const staffData = await staffResponse.json();
    console.log(`✅ Staff API works: ${staffData.count} staff members`);
    
    // Test 2: Check if performance page loads
    console.log('\n2. Testing Performance Page...');
    const perfResponse = await fetch('http://localhost:3000/hr/performance');
    const pageContent = await perfResponse.text();
    
    // Check for console.log messages in the page
    const hasLoadedStaff = pageContent.includes('Loaded') && pageContent.includes('real staff members');
    const hasFallback = pageContent.includes('Using mock employee data as fallback');
    const hasError = pageContent.includes('Error loading data');
    
    console.log(`Console messages found:`);
    console.log(`- "Loaded real staff members": ${hasLoadedStaff ? '✅ YES' : '❌ NO'}`);
    console.log(`- "Using mock employee data as fallback": ${hasFallback ? '✅ YES' : '❌ NO'}`);
    console.log(`- "Error loading data": ${hasError ? '✅ YES' : '❌ NO'}`);
    
    // Check what employees are actually being displayed
    const mockEmployees = pageContent.match(/EMP-2024-\d+/g) || [];
    const realEmployees = pageContent.match(/STAFF-[a-f0-9]+/g) || [];
    
    console.log(`\nEmployee IDs found:`);
    console.log(`- Mock employees (EMP-2024-XXX): ${mockEmployees.length}`);
    console.log(`- Real employees (STAFF-XXXX): ${realEmployees.length}`);
    
    if (mockEmployees.length > 0) {
      console.log('❌ Performance page is still using MOCK DATA');
      console.log('   The StaffService integration is failing silently.');
    } else if (realEmployees.length > 0) {
      console.log('✅ Performance page is using REAL STAFF DATA');
    }
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

// Helper fetch function
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

debugStaffLoading().catch(console.error);
