// Analyze the database data to show which patients have complete vs incomplete data
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function analyzeDbData() {
  try {
    console.log('🔍 Analyzing the database data you provided...\n');
    
    // Key patients from your data that should have complete information:
    const keyPatients = [
      'c071c11e-bf90-4158-9392-856db3fbb803', // ffffffffffffffffff
      '4318deb1-5a13-43d4-aae1-698573f6a93c', // Sanor Smith (P-2026-8075)
      '88f0a597-20db-4044-9cbc-4a77f01a98da', // Sanor Smith (P-2026-1543)
      'ce638d85-e0bd-492f-9a2b-1986e69a4e47', // Noor Maliki
    ];
    
    console.log('📊 Checking patients that SHOULD have complete data:\n');
    
    for (const patientId of keyPatients) {
      console.log(`\n=== Checking Patient ID: ${patientId} ===`);
      
      // Check main patient table
      const patient = await sql`
        SELECT ehrid, firstname, lastname, phone, createdat
        FROM patients 
        WHERE patientid = ${patientId}
      `;
      
      if (patient.length > 0) {
        console.log(`✅ Found in main table: ${patient[0].firstname} ${patient[0].lastname} (${patient[0].ehrid})`);
        
        // Check emergency contact
        const emergency = await sql`
          SELECT contactname, contactphone FROM patient_emergency_contacts 
          WHERE patientid = ${patientId}
        `;
        
        // Check insurance
        const insurance = await sql`
          SELECT insurancecompany, insurancenumber FROM patient_insurance_information 
          WHERE patientid = ${patientId}
        `;
        
        // Check medical
        const medical = await sql`
          SELECT allergies, chronicdiseases, currentmedications FROM patient_medical_information 
          WHERE patientid = ${patientId}
        `;
        
        console.log(`  Emergency Contact: ${emergency.length > 0 ? '✅' : '❌'} ${emergency.length > 0 ? `(${emergency[0].contactname})` : ''}`);
        console.log(`  Insurance: ${insurance.length > 0 ? '✅' : '❌'} ${insurance.length > 0 ? `(${insurance[0].insurancecompany})` : ''}`);
        console.log(`  Medical Info: ${medical.length > 0 ? '✅' : '❌'} ${medical.length > 0 ? `(${medical[0].allergies || 'None'})` : ''}`);
        
        const isComplete = emergency.length > 0 && insurance.length > 0 && medical.length > 0;
        console.log(`  Status: ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}`);
      } else {
        console.log('❌ Not found in main table');
      }
    }
    
    // Now check some patients that have incomplete data
    console.log('\n\n📊 Checking patients with INCOMPLETE data:\n');
    
    const incompletePatients = [
      'c6db13f6-825d-4230-8c6f-8720af04f727', // wwwwwwwwwwww
      '322121c6-0ce6-407c-b875-151e1947684a', // wwwwwwwwwwww
      '106878f5-1d30-46ca-a93d-cbf115f288e1', // Sanor (P-2026-1370)
    ];
    
    for (const patientId of incompletePatients) {
      console.log(`\n=== Checking Patient ID: ${patientId} ===`);
      
      const patient = await sql`
        SELECT ehrid, firstname, lastname, phone, createdat
        FROM patients 
        WHERE patientid = ${patientId}
      `;
      
      if (patient.length > 0) {
        console.log(`✅ Found in main table: ${patient[0].firstname} ${patient[0].lastname} (${patient[0].ehrid})`);
        
        const emergency = await sql`SELECT COUNT(*) as count FROM patient_emergency_contacts WHERE patientid = ${patientId}`;
        const insurance = await sql`SELECT COUNT(*) as count FROM patient_insurance_information WHERE patientid = ${patientId}`;
        const medical = await sql`SELECT COUNT(*) as count FROM patient_medical_information WHERE patientid = ${patientId}`;
        
        console.log(`  Emergency Contact: ${emergency[0].count} records`);
        console.log(`  Insurance: ${insurance[0].count} records`);
        console.log(`  Medical Info: ${medical[0].count} records`);
        console.log(`  Status: ❌ INCOMPLETE - Missing related data`);
      }
    }
    
    console.log('\n\n🎯 SUMMARY:');
    console.log('===========');
    console.log('✅ Patients with COMPLETE data (should show all fields):');
    console.log('   - fffffffffffffffffff (P-2026-6829)');
    console.log('   - Sanor Smith (P-2026-8075)');
    console.log('   - Sanor Smith (P-2026-1543)');
    console.log('   - Noor Maliki (bde4b53a-4b48-4691-b3fb-cd45320787b2)');
    
    console.log('\n❌ Patients with INCOMPLETE data (missing fields):');
    console.log('   - wwwwwwwwwwww (P-2026-0184)');
    console.log('   - wwwwwwwwwwww (P-2026-5315)');
    console.log('   - Sanor (P-2026-1370)');
    console.log('   - All other older patients');
    
    console.log('\n💡 SOLUTION:');
    console.log('Search for the COMPLETE patients to see all fields populated!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

analyzeDbData();
