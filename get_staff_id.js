const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function getStaffId() {
  try {
    const result = await pool.query('SELECT staffid FROM staff LIMIT 3');
    console.log('Available staff IDs:');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ${row.staffid}`);
    });
    
    if (result.rows.length > 0) {
      const firstId = result.rows[0].staffid;
      console.log(`\nUsing staff ID: ${firstId}`);
      
      // Check if this staff has compensation
      const compResult = await pool.query('SELECT * FROM employee_compensation WHERE employee_id = $1', [firstId]);
      if (compResult.rows.length > 0) {
        console.log('✅ Staff has compensation record');
        console.log(`Payment Frequency: ${compResult.rows[0].payment_frequency}`);
      } else {
        console.log('❌ No compensation record found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

getStaffId();
