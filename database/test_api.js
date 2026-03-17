const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testAPI() {
  try {
    console.log('🌐 Testing API endpoint data...');
    
    // Test GET endpoint
    const result = await pool.query(`
      SELECT 
        ae.id,
        ae.employee_name,
        ae.department,
        ae.exception_date,
        ae.exception_type,
        ae.severity,
        ae.review_status,
        ae.details,
        ae.minutes_late,
        ae.minutes_early,
        s.firstname || ' ' || s.lastname as full_name,
        s.custom_staff_id
      FROM attendance_exceptions ae
      LEFT JOIN staff s ON ae.employee_id = s.staffid
      ORDER BY ae.created_at DESC
      LIMIT 3
    `);
    
    console.log('\n📋 Sample API response data:');
    result.rows.forEach((row, i) => {
      console.log(`   Exception ${i+1}:`);
      console.log(`     ID: ${row.id}`);
      console.log(`     Employee: ${row.full_name} (${row.custom_staff_id})`);
      console.log(`     Department: ${row.department}`);
      console.log(`     Date: ${row.exception_date}`);
      console.log(`     Type: ${row.exception_type}`);
      console.log(`     Severity: ${row.severity}`);
      console.log(`     Status: ${row.review_status}`);
      console.log(`     Details: ${row.details}`);
    });
    
    // Test filtering logic
    const pending = await pool.query(`
      SELECT COUNT(*) as count 
      FROM attendance_exceptions 
      WHERE review_status = 'PENDING'
    `);
    
    const highSeverity = await pool.query(`
      SELECT COUNT(*) as count 
      FROM attendance_exceptions 
      WHERE severity = 'HIGH'
    `);
    
    const lateArrivals = await pool.query(`
      SELECT COUNT(*) as count 
      FROM attendance_exceptions 
      WHERE exception_type = 'LATE_ARRIVAL'
    `);
    
    console.log('\n📊 API filtering results:');
    console.log(`   Pending review: ${pending.rows[0].count}`);
    console.log(`   High severity: ${highSeverity.rows[0].count}`);
    console.log(`   Late arrivals: ${lateArrivals.rows[0].count}`);
    
    console.log('\n✅ API endpoint is ready for testing!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testAPI();
