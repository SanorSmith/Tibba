const http = require('http');

// Test the POST endpoint directly
const postData = JSON.stringify({
  employee_id: 'STAFF-ef80f705',
  shift_id: 'DAY',
  effective_date: '2026-02-01',
  schedule_type: 'REGULAR',
  notes: 'Test schedule creation',
  daily_details: [
    {
      day_of_week: 1,
      start_time: '08:00',
      end_time: '16:00',
      lunch_start: '12:00',
      lunch_end: '13:00',
      total_hours: 8,
      net_hours: 6.5
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/hr/schedules',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing POST /api/hr/schedules endpoint...');
console.log('📤 Request data:', JSON.stringify(JSON.parse(postData), null, 2));

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req.write(postData);
req.end();

// Also test GET endpoint for comparison
console.log('\n🧪 Testing GET /api/hr/schedules endpoint...');

const getOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/hr/schedules',
  method: 'GET'
};

const getReq = http.request(getOptions, (res) => {
  console.log(`📊 GET Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 GET Response Length:', data.length, 'characters');
    if (res.statusCode === 200) {
      console.log('✅ GET endpoint works');
    } else {
      console.log('❌ GET endpoint also has issues');
    }
  });
});

getReq.on('error', (error) => {
  console.error('❌ GET Request Error:', error.message);
});

getReq.end();
