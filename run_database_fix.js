// Use the same database connection as the API
const { Pool } = require('pg');

// Use the same connection string as in the API
const pool = new Pool({ 
  connectionString: "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function fixMedicalHistoryColumn() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Starting medical history column fix...\n');
    
    // 1. Check current column type
    console.log('1️⃣ Checking current column type...');
    const currentType = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patient_medical_information' 
        AND column_name = 'medicalhistory'
    `);
    console.log('Current column type:', currentType.rows[0]);
    
    // 2. Change column type from JSONB to TEXT
    console.log('\n2️⃣ Changing medicalhistory column type from JSONB to TEXT...');
    await client.query(`
      ALTER TABLE patient_medical_information 
      ALTER COLUMN medicalhistory TYPE TEXT USING medicalhistory::TEXT
    `);
    console.log('✅ Column type changed successfully');
    
    // 3. Clean up existing JSON data
    console.log('\n3️⃣ Cleaning up existing JSON data...');
    const cleanupResult = await client.query(`
      UPDATE patient_medical_information 
      SET medicalhistory = NULL 
      WHERE medicalhistory = '{}' 
         OR medicalhistory = '{"allergies":[],"conditions":[],"medications":[]}'
         OR medicalhistory = ''
      RETURNING patientid
    `);
    console.log(`✅ Cleaned up ${cleanupResult.rowCount} records`);
    
    // 4. Verify the change
    console.log('\n4️⃣ Verifying column type...');
    const verifyResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'patient_medical_information' 
        AND column_name = 'medicalhistory'
    `);
    console.log('New column type:', verifyResult.rows[0]);
    
    // 5. Show sample data
    console.log('\n5️⃣ Sample data:');
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
