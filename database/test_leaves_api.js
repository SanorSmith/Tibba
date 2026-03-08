const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/hr/leaves',
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
      console.log('🔍 Leaves API Response:');
      console.log('======================');
      console.log(`Success: ${result.success}`);
      console.log(`Count: ${result.count}`);
      console.log(`Data Length: ${result.data ? result.data.length : 0}`);
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('\n📋 Leave Requests:');
        result.data.forEach((leave, index) => {
          console.log(`${index + 1}. ${leave.employee_name} - ${leave.leave_type} (${leave.status})`);
          console.log(`   Dates: ${leave.start_date} to ${leave.end_date} (${leave.days_count} days)`);
          console.log(`   ID: ${leave.id}`);
          console.log('');
        });
      } else {
        console.log('No leave requests found or API error');
        if (result.error) {
          console.log('Error:', result.error);
        }
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
