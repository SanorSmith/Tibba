const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkRequests() {
  try {
    console.log('🔍 Checking existing leave requests...');
    
    const result = await pool.query('SELECT * FROM leave_requests LIMIT 3');
    
    console.log(`✅ Found ${result.rows.length} existing leave requests:`);
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ID: ${row.id}, Employee: ${row.employee_name}, Status: ${row.status}`);
    });
    
    if (result.rows.length > 0) {
      const firstRequest = result.rows[0];
      console.log('\n🎯 Creating approval for first request...');
      
      // Create approval for existing request
      await pool.query(`
        INSERT INTO leave_request_approvals (
          leave_request_id,
          approval_level,
          level_name,
          approver_id,
          approver_name,
          approver_role,
          status,
          assigned_at,
          due_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '48 hours')
      `, [
        firstRequest.id,
        1,
        'Manager Approval',
        '00000000-0000-0000-0000-000000000001',
        'Test Manager',
        'HR_ADMIN',
        'PENDING'
      ]);
      
      console.log('✅ Approval created successfully!');
      console.log('\n📋 Approval Details:');
      console.log(`   Employee: ${firstRequest.employee_name}`);
      console.log(`   Leave Type: ${firstRequest.leave_type_code}`);
      console.log(`   Dates: ${firstRequest.start_date} to ${firstRequest.end_date}`);
      console.log(`   Days: ${firstRequest.working_days_count}`);
      
      console.log('\n🎯 Now refresh the approvals page to see this request!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRequests();
