const http = require('http');

async function testPerformancePage() {
  console.log('🔍 Testing Performance Page Content');
  console.log('='.repeat(50));
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/hr/performance',
    method: 'GET'
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        // Check for mock vs real employee data
        const hasMockData = data.includes('Omar Al-Bayati') || data.includes('EMP-2024-003');
        const hasRealData = data.includes('ALI MOHAMED MAHMUD') || data.includes('STAFF-ef80f705');
        
        console.log(`\n📊 Results:`);
        console.log(`- Mock employee data found: ${hasMockData ? '❌ YES' : '✅ NO'}`);
        console.log(`- Real employee data found: ${hasRealData ? '✅ YES' : '❌ NO'}`);
        
        if (hasMockData) {
          console.log('\n❌ Performance page is still using MOCK DATA');
          console.log('   The StaffService integration is not working yet.');
        } else if (hasRealData) {
          console.log('\n✅ Performance page is using REAL STAFF DATA');
          console.log('   The StaffService integration is working!');
        } else {
          console.log('\n⚠️  Unable to determine employee data source');
          console.log('   Page might not be rendering properly.');
        }
        
        resolve({ hasMockData, hasRealData });
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

testPerformancePage().catch(console.error);
