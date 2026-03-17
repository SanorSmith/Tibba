const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function getRealEmployeeId() {
  try {
    const result = await pool.query(`
      SELECT DISTINCT employee_id, employee_name 
      FROM attendance_exceptions 
      WHERE review_status = 'PENDING'
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    return null;
  } catch (error) {
    console.error('Error getting employee:', error);
    return null;
  }
}

async function testAPIWithRealEmployee() {
  console.log('🔍 Testing Performance API with Real Employee');
  console.log('='.repeat(50));
  
  const employee = await getRealEmployeeId();
  
  if (!employee) {
    console.log('❌ No employees found with pending exceptions');
    return;
  }
  
  console.log(`✅ Found employee: ${employee.employee_name} (${employee.employee_id})`);
  
  const testData = {
    employee_id: employee.employee_id,
    review_period: {
      start_date: '2026-01-01',
      end_date: '2026-12-31'
    }
  };
  
  const postData = JSON.stringify(testData);
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/hr/performance/attendance-score',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = require('http').request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ API Response:', JSON.stringify(response, null, 2));
          resolve(response);
        } catch (e) {
          console.log('❌ Raw Response:', data);
          resolve({ error: 'Failed to parse response', raw: data });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

testAPIWithRealEmployee().catch(console.error).finally(() => pool.end());
