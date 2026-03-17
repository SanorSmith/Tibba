const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'staff\' ORDER BY ordinal_position').then(result => {
  console.log('Staff table columns:');
  result.rows.forEach(row => console.log(`- ${row.column_name}`));
  pool.end();
}).catch(err => {
  console.error('Error:', err.message);
  pool.end();
});
