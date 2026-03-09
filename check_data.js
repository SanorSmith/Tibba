const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkData() {
  try {
    console.log('Checking leave_types data...');
    const lt = await pool.query("SELECT id, name, accrual_frequency, accrual_rate, is_active FROM leave_types LIMIT 5");
    console.log('leave_types:', lt.rows);

    console.log('\nChecking leave_balance data...');
    const lb = await pool.query("SELECT * FROM leave_balance WHERE employee_id = '690d60d9-f83e-4acf-abd2-ce39ef80f705' AND year = 2026 LIMIT 5");
    console.log('leave_balance for employee:', lb.rows);

    console.log('\nChecking if employee exists...');
    const emp = await pool.query("SELECT staffid FROM staff WHERE staffid = '690d60d9-f83e-4acf-abd2-ce39ef80f705'");
    console.log('Employee exists:', emp.rows.length > 0);

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
checkData();
