const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function testStaffAPI() {
  try {
    console.log('🔍 Testing Staff API Data Source\n');
    console.log('='.repeat(50));

    // Test direct database query
    const query = `
      SELECT 
        staffid as id,
        firstname as "firstName",
        lastname as "lastName",
        role,
        unit,
        email,
        createdat as "createdAt"
      FROM staff 
      ORDER BY lastname, firstname 
      LIMIT 10
    `;

    const result = await pool.query(query);
    
    console.log(`✅ Found ${result.rows.length} staff members in database\n`);
    
    console.log('📋 Sample Staff Data:');
    result.rows.forEach((staff, index) => {
      console.log(`${index + 1}. ${staff.firstName} ${staff.lastName} - ${staff.role} (${staff.id})`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('🎯 API Response Format Should Be:');
    console.log(JSON.stringify({
      success: true,
      staff: result.rows,
      count: result.rows.length
    }, null, 2));

  } catch (error) {
    console.error('❌ Error testing staff data:', error);
  } finally {
    await pool.end();
  }
}

testStaffAPI();
