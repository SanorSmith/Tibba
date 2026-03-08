const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testSchedulesGet() {
  try {
    console.log('🧪 Testing schedules GET API query...');
    
    // Test the exact query from the API
    const query = `
      SELECT 
        es.id,
        es.employee_id,
        s.custom_staff_id as employee_number,
        s.firstname as first_name,
        s.lastname as last_name,
        s.unit as department_name,
        es.shift_id,
        sh.name as shift_name,
        sh.code as shift_code,
        sh.start_time as shift_start,
        sh.end_time as shift_end,
        es.effective_date,
        es.end_date,
        es.schedule_type,
        es.rotation_pattern,
        es.is_active,
        es.status,
        es.approved_by_name,
        es.approved_at,
        es.notes,
        es.created_at,
        es.updated_at
      FROM employee_schedules es
      INNER JOIN staff s ON es.employee_id = s.staffid
      LEFT JOIN shifts sh ON es.shift_id = sh.id
      WHERE 1=1
      ORDER BY es.effective_date DESC, s.firstname ASC
    `;
    
    const result = await pool.query(query);
    
    console.log('✅ Query executed successfully!');
    console.log(`📊 Found ${result.rows.length} schedules`);
    
    if (result.rows.length > 0) {
      console.log('\n📋 Sample schedule:');
      const sample = result.rows[0];
      console.log(`   ID: ${sample.id}`);
      console.log(`   Employee: ${sample.first_name} ${sample.last_name} (${sample.employee_number})`);
      console.log(`   Department: ${sample.department_name}`);
      console.log(`   Shift: ${sample.shift_name} (${sample.shift_code})`);
      console.log(`   Effective Date: ${sample.effective_date}`);
      console.log(`   Status: ${sample.status}`);
    } else {
      console.log('ℹ️  No schedules found. You may need to create some first.');
      console.log('\n📝 Tables involved in schedule creation:');
      console.log('   1. employee_schedules - Main schedule records');
      console.log('   2. daily_schedule_details - Daily time details');
      console.log('   3. staff - Employee information');
      console.log('   4. shifts - Shift definitions');
    }
    
    // Check table existence
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employee_schedules', 'daily_schedule_details', 'staff', 'shifts')
      ORDER BY table_name
    `);
    
    console.log('\n🗂️  Tables available:');
    tableCheck.rows.forEach(row => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testSchedulesGet();
