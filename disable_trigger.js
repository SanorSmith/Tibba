const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function disableTrigger() {
  try {
    await pool.query('ALTER TABLE leave_requests DISABLE TRIGGER trg_notify_leave_status_change');
    console.log('Trigger disabled successfully');
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
disableTrigger();
