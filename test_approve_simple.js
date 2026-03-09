const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function testApprove() {
  try {
    const id = 'bb043c88-a7e9-4089-96c5-5916081b00d6';
    const approver_id = '00000000-0000-0000-0000-000000000001';
    const approver_name = 'Test User';
    
    console.log('Approving request...');
    const result = await pool.query(`
      UPDATE leave_requests 
      SET status = 'APPROVED', 
          approved_by = $1,
          approved_by_name = $2,
          approved_at = NOW(),
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [approver_id, approver_name, id]);
    
    console.log('Success:', result.rows[0]);
    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
testApprove();
