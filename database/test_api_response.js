const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/hr/attendance?date=2026-02-01',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('API Response Structure:');
      console.log('======================');
      
      if (result.success && result.data && result.data.length > 0) {
        const sample = result.data[0];
        console.log('Sample record fields:');
        Object.keys(sample).forEach(key => {
          console.log(`  ${key}: ${sample[key]} (${typeof sample[key]})`);
        });
        
        console.log('\nEmployee ID field value:', sample.employee_id);
        console.log('Employee ID field type:', typeof sample.employee_id);
      } else {
        console.log('No data in response');
      }
    } catch (error) {
      console.error('Error parsing JSON:', error.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();
