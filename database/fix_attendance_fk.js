const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function fixAttendanceFK() {
  try {
    console.log('🔧 Fixing attendance foreign key...');
    
    // Check if daily_attendance table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'daily_attendance'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ daily_attendance table does not exist');
      return;
    }
    
    // Check current constraints
    const constraintCheck = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'daily_attendance' 
      AND constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('📊 Current constraints:', constraintCheck.rows.map(r => r.constraint_name).join(', '));
    
    // Drop existing foreign key constraints
    for (const constraint of constraintCheck.rows) {
      try {
        await pool.query(`ALTER TABLE daily_attendance DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}`);
        console.log(`✅ Dropped constraint: ${constraint.constraint_name}`);
      } catch (err) {
        console.log(`⚠️  Could not drop ${constraint.constraint_name}: ${err.message}`);
      }
    }
    
    // Add new foreign key constraint to staff table
    await pool.query(`
      ALTER TABLE daily_attendance 
      ADD CONSTRAINT daily_attendance_staff_fkey 
      FOREIGN KEY (employee_id) REFERENCES staff(staffid) ON DELETE CASCADE
    `);
    console.log('✅ Added new foreign key constraint to staff table');
    
    // Verify the constraint was added
    const result = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'daily_attendance' 
      AND constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('📊 Updated constraints:', result.rows.map(r => r.constraint_name).join(', '));
    
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

fixAttendanceFK();
