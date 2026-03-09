const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkApprovalTables() {
  try {
    console.log('Checking leave_requests table...');
    const lr = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='leave_requests' ORDER BY ordinal_position");
    console.log('leave_requests columns:', lr.rows.map(r => r.column_name).join(', '));

    console.log('\nChecking leave_approvals table...');
    const la = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='leave_approvals' ORDER BY ordinal_position");
    console.log('leave_approvals columns:', la.rows.map(r => r.column_name).join(', '));

    console.log('\nChecking leave_transactions table...');
    const lt = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='leave_transactions' ORDER BY ordinal_position");
    console.log('leave_transactions columns:', lt.rows.map(r => r.column_name).join(', '));

    await pool.end();
  } catch (e) {
    console.error('Error:', e.message);
    await pool.end();
  }
}
checkApprovalTables();
