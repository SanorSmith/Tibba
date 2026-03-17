const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkMedicalHistory() {
  try {
    const result = await pool.query(`
      SELECT patientid, medicalhistory 
      FROM patient_medical_information 
      WHERE medicalhistory = '{}' OR medicalhistory IS NULL
      ORDER BY createdat DESC
      LIMIT 5
    `);
    
    console.log('Patients with empty medical_history:');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMedicalHistory();
