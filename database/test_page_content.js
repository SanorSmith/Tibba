const http = require('http');

async function testPageContent() {
  console.log('🔍 Testing Performance Page Content After Restart');
  console.log('='.repeat(60));
  
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
        // Check for StaffService import
        const hasStaffService = data.includes('StaffService');
        const hasLoadData = data.includes('loadData');
        const hasRealStaff = data.includes('getAllStaff');
        const hasConsoleLog = data.includes('console.log');
        
        console.log('\n📊 Code Analysis:');
        console.log(`- StaffService import: ${hasStaffService ? '✅ YES' : '❌ NO'}`);
        console.log(`- loadData function: ${hasLoadData ? '✅ YES' : '❌ NO'}`);
        console.log(`- getAllStaff call: ${hasRealStaff ? '✅ YES' : '❌ NO'}`);
        console.log(`- console.log statements: ${hasConsoleLog ? '✅ YES' : '❌ NO'}`);
        
        // Check for specific employee names
        const hasOmar = data.includes('Omar Al-Bayati');
        const hasAliMohamed = data.includes('ALI MOHAMED MAHMUD');
        
        console.log('\n👥 Employee Names:');
        console.log(`- Omar Al-Bayati (mock): ${hasOmar ? '✅ YES' : '❌ NO'}`);
        console.log(`- ALI MOHAMED MAHMUD (real): ${hasAliMohamed ? '✅ YES' : '❌ NO'}`);
        
        // Look for the actual JavaScript code
        const staffServiceMatch = data.match(/import StaffService from ['"][^'"]+['"]/);
        const loadDataMatch = data.match(/const loadData = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\);/);
        
        if (staffServiceMatch) {
          console.log('\n📦 StaffService Import Found:');
          console.log(staffServiceMatch[0]);
        }
        
        if (loadDataMatch) {
          console.log('\n⚙️  LoadData Function Found:');
          console.log(loadDataMatch[0].substring(0, 200) + '...');
        }
        
        resolve({ hasStaffService, hasLoadData, hasRealStaff, hasOmar, hasAliMohamed });
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });
    
    req.end();
  });
}

testPageContent().catch(console.error);
