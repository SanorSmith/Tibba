const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function cleanAttendance() {
  try {
    console.log('🧹 Cleaning attendance data...');
    
    // Get all staff IDs
    const staffResult = await pool.query('SELECT staffid FROM staff');
    const staffIds = staffResult.rows.map(s => s.staffid);
    
    console.log(`📊 Found ${staffIds.length} staff records`);
    
    // Delete attendance records that don't match any staff ID
    if (staffIds.length > 0) {
      const deleteResult = await pool.query(`
        DELETE FROM daily_attendance 
        WHERE employee_id NOT IN (${staffIds.map((_, i) => `$${i + 1}`).join(',')})
      `, staffIds);
      
      console.log(`🧹 Deleted ${deleteResult.rowCount} invalid attendance records`);
    } else {
      // If no staff records, delete all attendance
      const deleteResult = await pool.query('DELETE FROM daily_attendance');
      console.log(`🧹 Deleted all ${deleteResult.rowCount} attendance records (no staff found)`);
    }
    
    // Now add the foreign key constraint
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
    
    // Test the fix
    const staffSample = await pool.query('SELECT staffid FROM staff LIMIT 1');
    const shiftsSample = await pool.query('SELECT id FROM shifts LIMIT 1');
    
    if (staffSample.rows.length > 0 && shiftsSample.rows.length > 0) {
      const testStaffId = staffSample.rows[0].staffid;
      const testShiftId = shiftsSample.rows[0].id;
      
      try {
        const insertTest = await pool.query(`
          INSERT INTO daily_attendance (
            employee_id, date, shift_id, status, organization_id
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `, [
          testStaffId,
          '2026-02-01',
          testShiftId,
          'PRESENT',
          '00000000-0000-0000-0000-000000000001'
        ]);
        
        console.log('✅ Test attendance created successfully:', insertTest.rows[0].id);
        
        // Clean up
        await pool.query('DELETE FROM daily_attendance WHERE id = $1', [insertTest.rows[0].id]);
        console.log('🧹 Test record cleaned up');
        
      } catch (error) {
        console.error('❌ Test failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanAttendance();
