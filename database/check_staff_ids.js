const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkStaffIds() {
  try {
    console.log('🔍 Checking staff IDs in database...');
    
    // Get all staff IDs and names
    const result = await pool.query(`
      SELECT 
        staffid,
        custom_staff_id,
        firstname,
        lastname,
        unit
      FROM staff 
      ORDER BY firstname, lastname
      LIMIT 10
    `);
    
    console.log('📊 Staff Records (first 10):');
    console.log('================================');
    result.rows.forEach(row => {
      console.log(`👤 ${row.firstname} ${row.lastname}`);
      console.log(`   staffid: ${row.staffid}`);
      console.log(`   custom_staff_id: ${row.custom_staff_id || 'NULL'}`);
      console.log(`   unit: ${row.unit || 'NULL'}`);
      console.log('');
    });
    
    // Check specific ID from error
    const testId = 'STAFF-ef80f705';
    const specificResult = await pool.query(`
      SELECT staffid, custom_staff_id, firstname, lastname
      FROM staff 
      WHERE custom_staff_id = $1 OR staffid::text = $1
    `, [testId]);
    
    console.log(`🔍 Searching for ID: ${testId}`);
    if (specificResult.rows.length > 0) {
      console.log('✅ Found:');
      specificResult.rows.forEach(row => {
        console.log(`   ${row.firstname} ${row.lastname} (${row.custom_staff_id || row.staffid})`);
      });
    } else {
      console.log('❌ Not found');
    }
    
    // Get a valid ID for testing
    const validResult = await pool.query(`
      SELECT custom_staff_id, firstname, lastname
      FROM staff 
      WHERE custom_staff_id IS NOT NULL 
      LIMIT 1
    `);
    
    if (validResult.rows.length > 0) {
      const validStaff = validResult.rows[0];
      console.log(`\n✅ Valid ID for testing: ${validStaff.custom_staff_id} (${validStaff.firstname} ${validStaff.lastname})`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStaffIds();
