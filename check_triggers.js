const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkTriggers() {
  try {
    const result = await pool.query(`
      SELECT trigger_name, event_manipulation, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_table = 'leave_requests'
    `);
    
    console.log('Triggers on leave_requests:', result.rows);
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
checkTriggers();
