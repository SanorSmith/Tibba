const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixMedicalHistoryColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting medical history column fix...\n');
    
    // 1. Change column type from JSONB to TEXT
    console.log('1️⃣ Changing medicalhistory column type from JSONB to TEXT...');
    await client.query(`
      ALTER TABLE patient_medical_information 
      ALTER COLUMN medicalhistory TYPE TEXT USING medicalhistory::TEXT
    `);
    console.log('✅ Column type changed successfully\n');
    
    // 2. Clean up existing JSON data
    console.log('2️⃣ Cleaning up existing JSON data...');
    const cleanupResult = await client.query(`
      UPDATE patient_medical_information 
      SET medicalhistory = NULL 
      WHERE medicalhistory = '{}' 
         OR medicalhistory = '{"allergies":[],"conditions":[],"medications":[]}'
         OR medicalhistory = ''
      RETURNING patientid
    `);
    console.log(`✅ Cleaned up ${cleanupResult.rowCount} records\n`);
    
    // 3. Verify the change
    console.log('3️⃣ Verifying column type...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patient_medical_information' 
        AND column_name = 'medicalhistory'
    `);
    console.log('Column info:', verifyResult.rows[0]);
    console.log('✅ Verification complete\n');
    
    // 4. Show sample data
    console.log('4️⃣ Sample data:');
    const sampleResult = await client.query(`
      SELECT patientid, medicalhistory, pg_typeof(medicalhistory) as data_type
      FROM patient_medical_information
      LIMIT 5
    `);
    console.log(sampleResult.rows);
    
    console.log('\n🎉 Medical history column fix completed successfully!');
    console.log('✅ The medicalhistory column now accepts plain text instead of JSON');
    
  } catch (error) {
    console.error('❌ Error fixing medical history column:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

fixMedicalHistoryColumn();
