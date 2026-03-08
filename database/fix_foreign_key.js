const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function fixForeignKey() {
  try {
    console.log('🔧 Fixing foreign key constraint...');
    
    // Drop the existing foreign key constraint
    await pool.query('ALTER TABLE employee_schedules DROP CONSTRAINT IF EXISTS employee_schedules_employee_fkey');
    console.log('✅ Dropped old foreign key constraint');
    
    // Add new foreign key constraint to staff table
    await pool.query(`
      ALTER TABLE employee_schedules 
      ADD CONSTRAINT employee_schedules_staff_fkey 
      FOREIGN KEY (employee_id) REFERENCES staff(staffid) ON DELETE CASCADE
    `);
    console.log('✅ Added new foreign key constraint to staff table');
    
    // Verify the constraint was added
    const result = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'employee_schedules' 
      AND constraint_type = 'FOREIGN KEY'
    `);
    
    console.log('📊 Foreign key constraints:', result.rows.map(r => r.constraint_name).join(', '));
    
    // Test the fix
    const staffSample = await pool.query('SELECT staffid FROM staff LIMIT 1');
    const shiftsSample = await pool.query('SELECT id FROM shifts LIMIT 1');
    
    if (staffSample.rows.length > 0 && shiftsSample.rows.length > 0) {
      const testStaffId = staffSample.rows[0].staffid;
      const testShiftId = shiftsSample.rows[0].id;
      
      try {
        const insertTest = await pool.query(`
          INSERT INTO employee_schedules (
            employee_id, shift_id, effective_date, schedule_type, status, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          testStaffId,
          testShiftId,
          '2026-02-01',
          'REGULAR',
          'ACTIVE',
          '00000000-0000-0000-0000-000000000001'
        ]);
        
        console.log('✅ Test schedule created successfully:', insertTest.rows[0].id);
        
        // Clean up
        await pool.query('DELETE FROM employee_schedules WHERE id = $1', [insertTest.rows[0].id]);
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

fixForeignKey();
