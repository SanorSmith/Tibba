const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createTestExceptions() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Creating test attendance exceptions...\n');
    
    // Step 1: Check current attendance data structure
    console.log('📊 Checking attendance data structure...');
    const sampleAttendance = await client.query(`
      SELECT 
        employee_id,
        employee_name,
        date,
        first_in,
        last_out,
        late_arrival_minutes,
        early_departure_min,
        status
      FROM daily_attendance 
      LIMIT 3
    `);
    
    console.log('Sample attendance records:');
    sampleAttendance.rows.forEach(row => {
      console.log(`   ${row.employee_name}: ${row.date} (${row.status})`);
      console.log(`      Check-in: ${row.first_in}, Check-out: ${row.last_out}`);
      console.log(`      Late: ${row.late_arrival_minutes}min, Early: ${row.early_departure_min}min`);
    });
    
    // Step 2: Get some employees to create exceptions for
    const employeesResult = await client.query(`
      SELECT 
        s.staffid as employee_id,
        s.firstname || ' ' || s.lastname as employee_name,
        s.custom_staff_id as employee_number,
        s.unit as department
      FROM staff s
      INNER JOIN daily_attendance da ON s.staffid = da.employee_id
      LIMIT 5
    `);
    
    console.log('\n👥 Creating exceptions for employees:');
    employeesResult.rows.forEach(emp => {
      console.log(`   - ${emp.employee_name} (${emp.employee_number})`);
    });
    
    // Step 3: Create test exceptions
    const testDate = new Date().toISOString().split('T')[0];
    let exceptionsCreated = 0;
    
    for (const emp of employeesResult.rows) {
      // Create a late arrival exception
      await client.query(`
        INSERT INTO attendance_exceptions (
          employee_id,
          employee_name,
          employee_number,
          department,
          exception_date,
          exception_type,
          details,
          severity,
          minutes_late,
          scheduled_start,
          actual_start,
          auto_detected,
          detection_rules
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `, [
        emp.employee_id,
        emp.employee_name,
        emp.employee_number,
        emp.department,
        testDate,
        'LATE_ARRIVAL',
        'Arrived 25 minutes late. Scheduled: 08:30, Actual: 08:55',
        'MEDIUM',
        25,
        '08:30:00',
        '08:55:00',
        true,
        '{"threshold_minutes": 15, "work_start": "08:30:00"}'
      ]);
      exceptionsCreated++;
      
      // Create an early departure exception for some employees
      if (Math.random() > 0.5) {
        await client.query(`
          INSERT INTO attendance_exceptions (
            employee_id,
            employee_name,
            employee_number,
            department,
            exception_date,
            exception_type,
            details,
            severity,
            minutes_early,
            scheduled_end,
            actual_end,
            auto_detected,
            detection_rules
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          emp.employee_id,
          emp.employee_name,
          emp.employee_number,
          emp.department,
          testDate,
          'EARLY_DEPARTURE',
          'Left 45 minutes early. Scheduled end: 16:30, Actual: 15:45',
          'HIGH',
          45,
          '16:30:00',
          '15:45:00',
          true,
          '{"threshold_minutes": 15, "work_end": "16:30:00"}'
        ]);
        exceptionsCreated++;
      }
      
      // Create a missing checkout for one employee
      if (exceptionsCreated === 2) {
        await client.query(`
          INSERT INTO attendance_exceptions (
            employee_id,
            employee_name,
            employee_number,
            department,
            exception_date,
            exception_type,
            details,
            severity,
            auto_detected
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          emp.employee_id,
          emp.employee_name,
          emp.employee_number,
          emp.department,
          testDate,
          'MISSING_CHECKOUT',
          'Checked in but no checkout recorded',
          'MEDIUM',
          true
        ]);
        exceptionsCreated++;
      }
    }
    
    console.log(`\n✅ Created ${exceptionsCreated} test exceptions`);
    
    // Step 4: Show the created exceptions
    console.log('\n📋 Created exceptions:');
    const createdExceptions = await client.query(`
      SELECT 
        ae.*,
        s.firstname || ' ' || s.lastname as full_name
      FROM attendance_exceptions ae
      LEFT JOIN staff s ON ae.employee_id = s.staffid
      WHERE ae.exception_date = $1
      ORDER BY ae.created_at DESC
    `, [testDate]);
    
    createdExceptions.rows.forEach(exc => {
      console.log(`   ${exc.full_name}: ${exc.exception_type} (${exc.severity})`);
      console.log(`      ${exc.details}`);
      console.log(`      Status: ${exc.review_status}`);
    });
    
    // Step 5: Test the detection function
    console.log('\n🔍 Testing detection function...');
    const detectionResult = await client.query(
      'SELECT * FROM detect_attendance_exceptions($1::DATE)',
      [testDate]
    );
    
    console.log(`   Detection function result: ${detectionResult.rows[0].exceptions_detected} exceptions`);
    
    // Step 6: Test API endpoint queries
    console.log('\n🌐 Testing API endpoint queries...');
    
    const totalCount = await client.query('SELECT COUNT(*) as count FROM attendance_exceptions');
    console.log(`   Total exceptions: ${totalCount.rows[0].count}`);
    
    const pendingCount = await client.query("SELECT COUNT(*) as count FROM attendance_exceptions WHERE review_status = 'PENDING'");
    console.log(`   Pending review: ${pendingCount.rows[0].count}`);
    
    const byType = await client.query(`
      SELECT exception_type, COUNT(*) as count 
      FROM attendance_exceptions 
      GROUP BY exception_type
    `);
    console.log('   By type:');
    byType.rows.forEach(row => {
      console.log(`     ${row.exception_type}: ${row.count}`);
    });
    
    const bySeverity = await client.query(`
      SELECT severity, COUNT(*) as count 
      FROM attendance_exceptions 
      GROUP BY severity
    `);
    console.log('   By severity:');
    bySeverity.rows.forEach(row => {
      console.log(`     ${row.severity}: ${row.count}`);
    });
    
    console.log('\n✅ Test data created successfully!');
    console.log('\n📌 Now you can:');
    console.log('   1. Visit /hr/attendance/exceptions in your browser');
    console.log('   2. See the test exceptions in the UI');
    console.log('   3. Test the filtering and actions');
    console.log('   4. Try the "Re-scan" button');
    
  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestExceptions();
