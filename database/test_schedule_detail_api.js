const http = require('http');

// Test the schedule detail API
const testScheduleId = '640e2f95-4639-4613-bdff-5dc712d00ed3'; // ALI MOHAMED MAHMUD's schedule

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/hr/schedules?id=${testScheduleId}`,
  method: 'GET'
};

console.log('🧪 Testing schedule detail API...');
console.log(`🔗 Testing schedule ID: ${testScheduleId}`);

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
      
      if (jsonData.success) {
        console.log('✅ Schedule found!');
        console.log(`👤 Employee: ${jsonData.data.employee_name}`);
        console.log(`🏢 Department: ${jsonData.data.department_name}`);
        console.log(`⏰ Shift: ${jsonData.data.shift_name}`);
        console.log(`📅 Period: ${jsonData.data.effective_date} - ${jsonData.data.end_date || 'Ongoing'}`);
        console.log(`📝 Daily Details: ${jsonData.data.daily_details?.length || 0} days`);
        
        if (jsonData.data.daily_details && jsonData.data.daily_details.length > 0) {
          console.log('\n📅 Sample Daily Details:');
          jsonData.data.daily_details.slice(0, 3).forEach((detail, index) => {
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayName = dayNames[detail.day_of_week - 1] || `Day ${detail.day_of_week}`;
            console.log(`  ${index + 1}. ${dayName}: ${detail.start_time} - ${detail.end_time} (${detail.total_work_hours}h total, ${detail.net_work_hours}h net)`);
          });
        }
        
        console.log(`\n🔗 Test the UI at: http://localhost:3000/hr/schedules/${testScheduleId}`);
      } else {
        console.log('❌ Error:', jsonData.error);
      }
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req.end();
