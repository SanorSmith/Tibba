const http = require('http');

// Test with a real staff ID from the database
const postData = JSON.stringify({
  employee_id: 'STAFF-0f705', // Using partial UUID from ALI MOHAMED MAHMUD (690d60d9-f83e-4acf-abd2-ce39ef80f705)
  shift_id: 'DAY',
  effective_date: '2026-02-01',
  schedule_type: 'REGULAR',
  notes: 'Test schedule creation with fixed API',
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

console.log('🧪 Testing POST with STAFF- prefixed ID...');
console.log('📤 Request data:', JSON.stringify(JSON.parse(postData), null, 2));

const req = http.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📄 Response Body:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.success) {
        console.log('✅ Schedule created successfully!');
      } else {
        console.log('❌ Error:', jsonData.error);
      }
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
