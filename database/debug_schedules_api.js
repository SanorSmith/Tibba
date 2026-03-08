const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function debugSchedulesAPI() {
  try {
    console.log('🔍 Debugging schedules API...');
    
    // Check if employee_schedules table exists
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'employee_schedules'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ employee_schedules table does not exist');
      return;
    }
    
    console.log('✅ employee_schedules table exists');
    
    // Check table structure
    const structureCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'employee_schedules' 
      ORDER BY ordinal_position
    `);
    
    console.log('📊 Table structure:');
    structureCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
    
    // Check if staff table exists and has data
    const staffCheck = await pool.query('SELECT COUNT(*) as count FROM staff');
    console.log(`📊 Staff records: ${staffCheck.rows[0].count}`);
    
    // Check if shifts table exists
    const shiftsCheck = await pool.query('SELECT COUNT(*) as count FROM shifts');
    console.log(`📊 Shift records: ${shiftsCheck.rows[0].count}`);
    
    // Test a simple insert
    console.log('🧪 Testing sample schedule creation...');
    const testStaff = await pool.query('SELECT staffid, custom_staff_id FROM staff LIMIT 1');
    const testShift = await pool.query('SELECT id, code FROM shifts LIMIT 1');
    
    if (testStaff.rows.length > 0 && testShift.rows.length > 0) {
      try {
        const insertTest = await pool.query(`
          INSERT INTO employee_schedules (
            employee_id, shift_id, effective_date, schedule_type, status, organization_id
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          testStaff.rows[0].staffid,
          testShift.rows[0].id,
          '2026-02-01',
          'REGULAR',
          'ACTIVE',
          '00000000-0000-0000-0000-000000000001'
        ]);
        
        console.log('✅ Sample schedule created:', insertTest.rows[0].id);
        
        // Clean up test record
        await pool.query('DELETE FROM employee_schedules WHERE id = $1', [insertTest.rows[0].id]);
        console.log('🧹 Test record cleaned up');
        
      } catch (insertError) {
        console.error('❌ Insert test failed:', insertError.message);
      }
    } else {
      console.log('❌ Cannot test insert - missing staff or shifts data');
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await pool.end();
  }
}

debugSchedulesAPI();
