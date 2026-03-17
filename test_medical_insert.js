const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function testInsert() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Test inserting different values
    const testPatientId = 'test-' + Date.now();
    
    console.log('Testing medical history insertion...');
    
    // Insert with text value
    await client.query(`
      INSERT INTO patient_medical_information (patientid, medicalhistory, createdat, updatedat)
      VALUES ($1, $2, NOW(), NOW())
    `, [testPatientId, 'This is test medical history text']);
    
    // Read it back
    const result = await client.query(`
      SELECT medicalhistory, pg_typeof(medicalhistory) as type
      FROM patient_medical_information
      WHERE patientid = $1
    `, [testPatientId]);
    
    console.log('Inserted value:', result.rows[0]);
    
    // Clean up
    await client.query('DELETE FROM patient_medical_information WHERE patientid = $1', [testPatientId]);
    
    await client.query('ROLLBACK');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testInsert();
