const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const nationalId = process.argv[2] || '199001010101';
  
  try {
    const result = await pool.query(
      'SELECT firstname, middlename, lastname, nationalid FROM patients WHERE nationalid = $1',
      [nationalId]
    );
    
    if (result.rows.length > 0) {
      const patient = result.rows[0];
      const fullName = `${patient.firstname} ${patient.middlename || ''} ${patient.lastname}`.trim();
      console.log(`Patient Name: ${fullName}`);
      console.log(`National ID: ${patient.nationalid}`);
    } else {
      console.log('Patient not found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
