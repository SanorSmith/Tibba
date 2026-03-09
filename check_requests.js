const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkRequests() {
  try {
    console.log('Checking sample leave_requests data...');
    const lr = await pool.query("SELECT id, status, approved_by, approved_by_name, approved_at FROM leave_requests LIMIT 3");
    console.log('leave_requests sample:', lr.rows);

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
checkRequests();
