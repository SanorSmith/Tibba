const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkAttendanceRecords() {
  try {
    console.log('🔍 Checking attendance records...');
    
    // Check if attendance table exists and has records
    const countResult = await pool.query('SELECT COUNT(*) as count FROM daily_attendance');
    console.log(`📊 Total attendance records: ${countResult.rows[0].count}`);
    
    if (countResult.rows[0].count === 0) {
      console.log('❌ No attendance records found. Creating sample data...');
      await createSampleAttendanceData();
    } else {
      console.log('✅ Attendance records exist. Showing sample:');
      
      const sampleResult = await pool.query(`
        SELECT 
          da.id,
          da.date,
          da.status,
          s.firstname,
          s.lastname,
          s.custom_staff_id
        FROM daily_attendance da
        LEFT JOIN staff s ON da.employee_id = s.staffid
        ORDER BY da.date DESC
        LIMIT 5
      `);
      
      sampleResult.rows.forEach(row => {
        console.log(`👤 ${row.firstname || 'Unknown'} ${row.lastname || ''} - ${row.date} - ${row.status} (${row.custom_staff_id || 'N/A'})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function createSampleAttendanceData() {
  try {
    console.log('🔨 Creating sample attendance data...');
    
    // Get staff records
    const staffResult = await pool.query('SELECT staffid, firstname, lastname, custom_staff_id FROM staff LIMIT 3');
    
    if (staffResult.rows.length === 0) {
      console.log('❌ No staff records found. Please create staff first.');
      return;
    }
    
    // Get shift records
    const shiftResult = await pool.query('SELECT id, code, name FROM shifts LIMIT 2');
    
    if (shiftResult.rows.length === 0) {
      console.log('❌ No shift records found. Please create shifts first.');
      return;
    }
    
    // Create attendance records for the last 7 days
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const staff of staffResult.rows) {
        const shift = shiftResult.rows[Math.floor(Math.random() * shiftResult.rows.length)];
        
        // Randomly decide if employee was present (80% chance)
        const isPresent = Math.random() > 0.2;
        const status = isPresent ? 'PRESENT' : 'ABSENT';
        
        if (isPresent) {
          // Create attendance record with times
          const attendanceData = {
            employee_id: staff.staffid,
            date: dateStr,
            shift_id: shift.id,
            status: status,
            first_in: '08:00:00',
            last_out: '16:30:00',
            total_hours: 8.5,
            regular_hours: 8.0,
            overtime_hours: 0.5,
            late_arrival_minutes: Math.random() > 0.7 ? 15 : 0
          };
          
          await pool.query(`
            INSERT INTO daily_attendance (
              employee_id, date, shift_id, status, first_in, last_out, 
              total_hours, regular_hours, overtime_hours, late_arrival_minutes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            attendanceData.employee_id,
            attendanceData.date,
            attendanceData.shift_id,
            attendanceData.status,
            attendanceData.first_in,
            attendanceData.last_out,
            attendanceData.total_hours,
            attendanceData.regular_hours,
            attendanceData.overtime_hours,
            attendanceData.late_arrival_minutes
          ]);
          
          console.log(`✅ Created record for ${staff.firstname} ${staff.lastname} - ${dateStr} - ${status}`);
        } else {
          // Create absent record
          await pool.query(`
            INSERT INTO daily_attendance (
              employee_id, date, shift_id, status
            ) VALUES ($1, $2, $3, $4)
          `, [staff.staffid, dateStr, shift.id, status]);
          
          console.log(`✅ Created absent record for ${staff.firstname} ${staff.lastname} - ${dateStr} - ${status}`);
        }
      }
    }
    
    // Verify created records
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM daily_attendance');
    console.log(`✅ Created ${finalCount.rows[0].count} attendance records successfully!`);
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
  }
}

checkAttendanceRecords();
