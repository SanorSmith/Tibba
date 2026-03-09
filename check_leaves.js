const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkTables() {
  try {
    console.log('Checking leave_balance table...');
    const lb = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='leave_balance' ORDER BY ordinal_position");
    console.log('leave_balance columns:', lb.rows.map(r => r.column_name).join(', '));

    console.log('\nChecking leave_types table...');
    const lt = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='leave_types' ORDER BY ordinal_position");
    console.log('leave_types columns:', lt.rows.map(r => r.column_name).join(', '));

    console.log('\nChecking staff table...');
    const staff = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='staff' ORDER BY ordinal_position");
    console.log('staff columns:', staff.rows.map(r => r.column_name).join(', '));

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
checkTables();
