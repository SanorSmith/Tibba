const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testAttendanceExceptions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing Attendance Exceptions System...\n');
    
    // Step 1: Check existing attendance data
    console.log('📊 Checking existing attendance data...');
    const attendanceCount = await client.query('SELECT COUNT(*) as count FROM daily_attendance');
    console.log(`   Daily attendance records: ${attendanceCount.rows[0].count}`);
    
    // Step 2: Get sample dates to test
    const datesResult = await client.query(`
      SELECT DISTINCT date 
      FROM daily_attendance 
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date DESC
      LIMIT 5
    `);
    
    console.log('\n📅 Testing with recent dates:');
    const testDates = datesResult.rows.map(r => r.date);
    testDates.forEach(date => {
      console.log(`   - ${date.toISOString().split('T')[0]}`);
    });
    
    // Step 3: Run detection for each date
    let totalExceptions = 0;
    
    for (const date of testDates) {
      console.log(`\n🔍 Detecting exceptions for ${date.toISOString().split('T')[0]}...`);
      
      const detectionResult = await client.query(
        'SELECT * FROM detect_attendance_exceptions($1::DATE)',
        [date]
      );
      
      const detected = detectionResult.rows[0].exceptions_detected;
      totalExceptions += detected;
      
      if (detected > 0) {
        console.log(`   ✅ Found ${detected} exceptions`);
        
        // Show sample of detected exceptions
        const sampleResult = await client.query(`
          SELECT 
            employee_name,
            exception_type,
            severity,
            details,
            minutes_late,
            minutes_early
          FROM attendance_exceptions 
          WHERE exception_date = $1
          ORDER BY created_at DESC
          LIMIT 3
        `, [date]);
        
        sampleResult.rows.forEach(exc => {
          console.log(`      - ${exc.employee_name}: ${exc.exception_type} (${exc.severity})`);
          console.log(`        ${exc.details}`);
        });
      } else {
        console.log(`   ℹ️  No exceptions found`);
      }
    }
    
    // Step 4: Show summary of all exceptions
    console.log('\n📊 Summary of all exceptions:');
    const summaryResult = await client.query(`
      SELECT 
        exception_type,
        severity,
        COUNT(*) as count
      FROM attendance_exceptions
      GROUP BY exception_type, severity
      ORDER BY exception_type, severity
    `);
    
    if (summaryResult.rows.length > 0) {
      summaryResult.rows.forEach(row => {
        console.log(`   ${row.exception_type} (${row.severity}): ${row.count}`);
      });
    } else {
      console.log('   No exceptions detected');
    }
    
    // Step 5: Test the API endpoint
    console.log('\n🌐 Testing API endpoint...');
    
    const totalResult = await client.query('SELECT COUNT(*) as count FROM attendance_exceptions');
    console.log(`   Total exceptions in database: ${totalResult.rows[0].count}`);
    
    // Test filtering
    const pendingResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM attendance_exceptions 
      WHERE review_status = 'PENDING'
    `);
    console.log(`   Pending review: ${pendingResult.rows[0].count}`);
    
    const highSeverityResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM attendance_exceptions 
      WHERE severity = 'HIGH'
    `);
    console.log(`   High severity: ${highSeverityResult.rows[0].count}`);
    
    // Step 6: Show sample full exception record
    if (totalResult.rows[0].count > 0) {
      console.log('\n📋 Sample exception record:');
      const fullSample = await client.query(`
        SELECT 
          ae.*,
          s.firstname || ' ' || s.lastname as full_name,
          s.custom_staff_id,
          s.unit as department
        FROM attendance_exceptions ae
        LEFT JOIN staff s ON ae.employee_id = s.staffid
        ORDER BY ae.created_at DESC
        LIMIT 1
      `);
      
      const sample = fullSample.rows[0];
      console.log(`   ID: ${sample.id}`);
      console.log(`   Employee: ${sample.full_name} (${sample.custom_staff_id})`);
      console.log(`   Department: ${sample.department}`);
      console.log(`   Date: ${sample.exception_date}`);
      console.log(`   Type: ${sample.exception_type}`);
      console.log(`   Severity: ${sample.severity}`);
      console.log(`   Status: ${sample.review_status}`);
      console.log(`   Details: ${sample.details}`);
      console.log(`   Auto-detected: ${sample.auto_detected}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📌 Next steps:');
    console.log('   1. Visit /hr/attendance/exceptions in your browser');
    console.log('   2. Click "Re-scan" to test the UI');
    console.log('   3. Try filtering by status, severity, or type');
    console.log('   4. Test the justify/warn/dismiss actions');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testAttendanceExceptions();
