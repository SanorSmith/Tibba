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
      console.log('🔍 API Field Structure:');
      console.log('======================');
      
      if (result.success && result.data && result.data.length > 0) {
        const sample = result.data[0];
        console.log('Sample record fields:');
        Object.keys(sample).forEach(key => {
          console.log(`  ${key}: ${sample[key]} (${typeof sample[key]})`);
        });
        
        console.log('\n📊 Field Mappings Needed:');
        console.log('- employee_name:', sample.employee_name);
        console.log('- leave_type:', sample.leave_type);
        console.log('- leave_type_name:', sample.leave_type_name);
        console.log('- start_date:', sample.start_date);
        console.log('- end_date:', sample.end_date);
        console.log('- days_count:', sample.days_count);
        console.log('- status:', sample.status);
        console.log('- created_at:', sample.created_at);
      }
    } catch (error) {
      console.error('Error parsing JSON:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();
