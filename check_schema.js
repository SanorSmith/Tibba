const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'patient_medical_information'
      AND column_name = 'medicalhistory'
    `);
    
    console.log('Schema for medicalhistory column:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Also check actual data
    const dataResult = await pool.query(`
      SELECT patientid, medicalhistory, pg_typeof(medicalhistory) as data_type
      FROM patient_medical_information
      ORDER BY createdat DESC
      LIMIT 5
    `);
    
    console.log('\nRecent medical history data:');
    console.log(JSON.stringify(dataResult.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkSchema();
