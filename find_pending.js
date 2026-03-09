const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function findPending() {
  try {
    const result = await pool.query("SELECT id, status, employee_name FROM leave_requests WHERE status = 'PENDING' LIMIT 3");
    console.log('Pending requests:', result.rows);
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
findPending();
