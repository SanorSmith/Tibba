const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createFebAttendanceData() {
  try {
    console.log('🔨 Creating attendance data for February 1st...');
    
    // Get staff records
    const staffResult = await pool.query('SELECT staffid, firstname, lastname, custom_staff_id FROM staff LIMIT 3');
    
    if (staffResult.rows.length === 0) {
      console.log('❌ No staff records found.');
      return;
    }
    
    // Get shift records
    const shiftResult = await pool.query('SELECT id, code, name FROM shifts LIMIT 2');
    
    if (shiftResult.rows.length === 0) {
      console.log('❌ No shift records found.');
      return;
    }
    
    console.log(`✅ Found ${staffResult.rows.length} staff and ${shiftResult.rows.length} shifts`);
    
    // Create attendance records for February 1st
    const dateStr = '2026-02-01';
    const shift = shiftResult.rows[0];
    
    for (const staff of staffResult.rows) {
      // Create attendance record with times
      await pool.query(`
        INSERT INTO daily_attendance (
          employee_id, date, shift_id, status, first_in, last_out, 
          total_hours, regular_hours, overtime_hours, late_arrival_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        staff.staffid,
        dateStr,
        shift.id,
        'PRESENT',
        `${dateStr} 08:00:00`,
        `${dateStr} 16:30:00`,
        8.5,
        8.0,
        0.5,
        0
      ]);
      
      console.log(`✅ Created record for ${staff.firstname} ${staff.lastname} - ${dateStr} - PRESENT (8.5h)`);
    }
    
    console.log('✅ February 1st attendance data created successfully!');
    
    // Verify created records
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM daily_attendance WHERE date = $1', [dateStr]);
    console.log(`📊 Total records for ${dateStr}: ${finalCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error creating attendance data:', error.message);
  } finally {
    await pool.end();
  }
}

createFebAttendanceData();
