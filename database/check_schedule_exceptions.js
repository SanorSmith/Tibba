const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkScheduleExceptionsStructure() {
  try {
    // Check if table exists and has data
    const countResult = await pool.query('SELECT COUNT(*) as count FROM schedule_exceptions');
    console.log('📊 Schedule exceptions records:', countResult.rows[0].count);
    
    // Check if employees table exists (foreign key reference)
    const employeesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'employees'
      ) as exists
    `);
    console.log('📋 Employees table exists:', employeesCheck.rows[0].exists);
    
    // Check sample data if any
    if (countResult.rows[0].count > 0) {
      const sample = await pool.query('SELECT * FROM schedule_exceptions LIMIT 2');
      console.log('📋 Sample schedule exceptions:');
      sample.rows.forEach(row => {
        console.log('  -', JSON.stringify(row, null, 2));
      });
    }
    
    console.log('\n🎯 This table is designed for:');
    console.log('  - Schedule modifications (time changes, shift changes)');
    console.log('  - Employee schedule exceptions (approved/rejected)');
    console.log('  - Paid/unpaid exceptions');
    console.log('  - Approval workflow tracking');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkScheduleExceptionsStructure();
