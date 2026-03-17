const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function getCompensationStaff() {
  try {
    const result = await pool.query('SELECT DISTINCT employee_id FROM employee_compensation LIMIT 3');
    console.log('Staff IDs with compensation:');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.employee_id}`);
    });
    
    if (result.rows.length > 0) {
      console.log(`\n✅ Use this ID in your compensation page:`);
      console.log(`const testUserId = '${result.rows[0].employee_id}';`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getCompensationStaff();
