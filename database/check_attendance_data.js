const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkAttendanceData() {
  try {
    console.log('🔍 Checking attendance data...');
    
    // Check if there are existing records
    const attendanceCheck = await pool.query('SELECT COUNT(*) as count FROM daily_attendance');
    console.log(`📊 Attendance records: ${attendanceCheck.rows[0].count}`);
    
    if (attendanceCheck.rows[0].count > 0) {
      // Check sample records
      const sampleRecords = await pool.query('SELECT employee_id, date, status FROM daily_attendance LIMIT 5');
      console.log('📊 Sample attendance records:');
      sampleRecords.rows.forEach(record => {
        console.log(`  - ${record.employee_id}: ${record.date} (${record.status})`);
      });
      
      // Check if these employee_ids exist in staff table
      const staffCheck = await pool.query('SELECT staffid FROM staff');
      const staffIds = staffCheck.rows.map(s => s.staffid);
      
      const invalidRecords = await pool.query(`
        SELECT employee_id, COUNT(*) as count 
        FROM daily_attendance 
        WHERE employee_id NOT IN (${staffIds.map((_, i) => `$${i + 1}`).join(',')})
        GROUP BY employee_id
      `, staffIds);
      
      if (invalidRecords.rows.length > 0) {
        console.log('❌ Invalid employee_ids found in attendance:');
        invalidRecords.rows.forEach(record => {
          console.log(`  - ${record.employee_id}: ${record.count} records`);
        });
        
        // Delete invalid records
        await pool.query(`
          DELETE FROM daily_attendance 
          WHERE employee_id NOT IN (${staffIds.map((_, i) => `$${i + 1}`).join(',')})
        `);
        console.log('🧹 Cleaned up invalid attendance records');
      }
    }
    
    // Now try to add the foreign key constraint
    try {
      await pool.query(`
        ALTER TABLE daily_attendance 
        ADD CONSTRAINT daily_attendance_staff_fkey 
        FOREIGN KEY (employee_id) REFERENCES staff(staffid) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint added successfully');
    } catch (error) {
      console.error('❌ Could not add foreign key:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAttendanceData();
