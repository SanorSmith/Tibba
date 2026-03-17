const http = require('http');

async function testPerformanceAPI() {
  console.log('🔍 Testing Performance API Endpoint');
  console.log('='.repeat(50));
  
  const testData = {
    employee_id: 'EMP-2024-003',
    review_period: {
      start_date: '2026-01-01',
      end_date: '2026-12-31'
    }
  };
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/hr/performance/attendance-score',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('Response:', JSON.stringify(response, null, 2));
          resolve(response);
        } catch (e) {
          console.log('Raw Response:', data);
          resolve({ error: 'Failed to parse response', raw: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request Error:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

async function testWithDifferentEmployee() {
  console.log('\n🎯 Testing with different employee IDs...');
  
  const testEmployees = [
    'EMP-2024-003',
    'EMP-2024-005', 
    'EMP-2024-013',
    'EMP-2024-024',
    'EMP-2024-025'
  ];
  
  for (const empId of testEmployees) {
    console.log(`\nTesting employee: ${empId}`);
    
    try {
      const response = await testPerformanceAPI();
      if (response.success) {
        console.log(`✅ SUCCESS: ${empId} - Score: ${response.data.attendance_score}`);
        break;
      } else {
        console.log(`❌ FAILED: ${empId} - ${response.error}`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${empId} - ${error.message}`);
    }
  }
}

testWithDifferentEmployee().catch(console.error);
