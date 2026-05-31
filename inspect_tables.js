const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function inspect() {
  const client = await pool.connect();
  try {
    // job_candidates
    const jc = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='job_candidates' ORDER BY ordinal_position`);
    console.log('=== job_candidates columns ===');
    jc.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // job_vacancies
    const jv = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='job_vacancies' ORDER BY ordinal_position`);
    console.log('\n=== job_vacancies columns ===');
    jv.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // employees PK
    const emp = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='employees' ORDER BY ordinal_position`);
    console.log('\n=== employees columns ===');
    emp.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // departments PK
    const dept = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='departments' ORDER BY ordinal_position`);
    console.log('\n=== departments columns ===');
    dept.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // users PK
    const users = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`);
    console.log('\n=== users columns ===');
    users.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // workspaces PK
    const ws = await client.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='workspaces' ORDER BY ordinal_position`);
    console.log('\n=== workspaces columns ===');
    ws.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

  } finally {
    client.release();
    await pool.end();
  }
}

inspect().catch(console.error);
