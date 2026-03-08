const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkLeaveStructure() {
  try {
    console.log('🔍 Checking leave_requests table structure...');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leave_requests'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 leave_requests columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    console.log('\n🔍 Checking leave_types table structure...');
    
    const leaveTypesResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'leave_types'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 leave_types columns:');
    leaveTypesResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable})`);
    });
    
    console.log('\n🔍 Sample leave_requests data:');
    const sampleData = await pool.query('SELECT * FROM leave_requests LIMIT 1');
    if (sampleData.rows.length > 0) {
      console.log('Sample record:');
      Object.keys(sampleData.rows[0]).forEach(key => {
        console.log(`  ${key}: ${sampleData.rows[0][key]}`);
      });
    } else {
      console.log('No data in leave_requests table');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkLeaveStructure();
