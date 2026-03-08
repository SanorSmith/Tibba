const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkForeignKeys() {
  try {
    console.log('🔍 Checking foreign key constraints...');
    
    // Check staff table structure
    const staffStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'staff' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Staff table structure:');
    staffStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if we have staff records
    const staffSample = await pool.query('SELECT staffid, firstname, lastname FROM staff LIMIT 3');
    console.log('📊 Sample staff records:');
    staffSample.rows.forEach(staff => {
      console.log(`  - ${staff.staffid}: ${staff.firstname} ${staff.lastname}`);
    });
    
    // Check shifts table structure
    const shiftsStructure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shifts' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Shifts table structure:');
    shiftsStructure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if we have shift records
    const shiftsSample = await pool.query('SELECT id, code, name FROM shifts LIMIT 3');
    console.log('📊 Sample shift records:');
    shiftsSample.rows.forEach(shift => {
      console.log(`  - ${shift.id}: ${shift.code} - ${shift.name}`);
    });
    
    // Test with actual UUIDs
    if (staffSample.rows.length > 0 && shiftsSample.rows.length > 0) {
      const testStaffId = staffSample.rows[0].staffid;
      const testShiftId = shiftsSample.rows[0].id;
      
      console.log(`🧪 Testing with staffId: ${testStaffId}, shiftId: ${testShiftId}`);
      
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
        
        console.log('✅ Sample schedule created:', insertTest.rows[0].id);
        
        // Clean up
        await pool.query('DELETE FROM employee_schedules WHERE id = $1', [insertTest.rows[0].id]);
        console.log('🧹 Test record cleaned up');
        
      } catch (error) {
        console.error('❌ Insert failed:', error.message);
        console.error('Full error:', error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkForeignKeys();
