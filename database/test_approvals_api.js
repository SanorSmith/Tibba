const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/hr/leaves/approvals',
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
      console.log('🔍 Approvals API Response:');
      console.log('=======================');
      console.log(`Status: ${res.statusCode}`);
      console.log(`Success: ${result.success}`);
      console.log(`Count: ${result.count}`);
      console.log(`Data Length: ${result.data ? result.data.length : 0}`);
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('\n📋 Pending Approvals:');
        result.data.forEach((approval, index) => {
          console.log(`${index + 1}. ${approval.employee_name} - ${approval.leave_type_name}`);
          console.log(`   Dates: ${approval.start_date} to ${approval.end_date}`);
          console.log(`   Level: ${approval.level_name}`);
          console.log('');
        });
      } else {
        console.log('No pending approvals found or API error');
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
