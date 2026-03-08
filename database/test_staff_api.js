const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testStaffAPI() {
  try {
    console.log('🔍 Testing staff table...');
    
    // Check if staff table exists and has data
    const result = await pool.query(`
      SELECT 
        staffid, 
        custom_staff_id, 
        firstname, 
        lastname, 
        unit, 
        role 
      FROM staff 
      LIMIT 5
    `);
    
    console.log('✅ Staff table data:');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.firstname} ${row.lastname} (${row.custom_staff_id || row.staffid}) - ${row.unit || 'No Unit'} - ${row.role}`);
    });
    
    console.log(`\n📊 Total staff records: ${result.rows.length} shown`);
    
    // Check for duplicate custom_staff_id
    const duplicateCheck = await pool.query(`
      SELECT custom_staff_id, COUNT(*) as count 
      FROM staff 
      WHERE custom_staff_id IS NOT NULL 
      GROUP BY custom_staff_id 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rows.length > 0) {
      console.log('\n⚠️  Duplicate custom_staff_id values found:');
      duplicateCheck.rows.forEach(row => {
        console.log(`  ${row.custom_staff_id}: ${row.count} records`);
      });
    } else {
      console.log('\n✅ No duplicate custom_staff_id values found');
    }
    
  } catch (error) {
    console.error('❌ Error testing staff table:', error.message);
  } finally {
    await pool.end();
  }
}

testStaffAPI();
