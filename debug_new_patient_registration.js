// Debug script to check new patient registration
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function debugNewPatientRegistration() {
  try {
    console.log('🔍 Debugging new patient registration...\n');
    
    // Check the most recent patients in the main table
    console.log('📋 Checking most recent patients in main table:\n');
    const recentPatients = await sql`
      SELECT patientid, ehrid, firstname, lastname, phone, createdat
      FROM patients 
      ORDER BY createdat DESC 
      LIMIT 5
    `;
    
    recentPatients.forEach((patient, index) => {
      console.log(`${index + 1}. ${patient.firstname} ${patient.lastname}`);
      console.log(`   ID: ${patient.patientid}`);
      console.log(`   Patient Number: ${patient.ehrid}`);
      console.log(`   Phone: ${patient.phone}`);
      console.log(`   Created: ${patient.createdat}\n`);
    });
    
    // Check if these patients have related data
    console.log('🔍 Checking related data for recent patients:\n');
    
    for (const patient of recentPatients) {
      console.log(`\n=== Patient: ${patient.firstname} ${patient.lastname} ===`);
      
      // Check emergency contact
      const emergency = await sql`
        SELECT * FROM patient_emergency_contacts 
        WHERE patientid = ${patient.patientid}
      `;
      
      // Check insurance
      const insurance = await sql`
        SELECT * FROM patient_insurance_information 
        WHERE patientid = ${patient.patientid}
      `;
      
      // Check medical info
      const medical = await sql`
        SELECT * FROM patient_medical_information 
        WHERE patientid = ${patient.patientid}
      `;
      
      console.log(`Emergency Contact: ${emergency.length > 0 ? 'YES' : 'NO'} (${emergency.length} records)`);
      if (emergency.length > 0) {
        console.log(`  - Name: ${emergency[0].contactname}`);
        console.log(`  - Phone: ${emergency[0].contactphone}`);
      }
      
      console.log(`Insurance: ${insurance.length > 0 ? 'YES' : 'NO'} (${insurance.length} records)`);
      if (insurance.length > 0) {
        console.log(`  - Company: ${insurance[0].insurancecompany}`);
        console.log(`  - Number: ${insurance[0].insurancenumber}`);
      }
      
      console.log(`Medical Info: ${medical.length > 0 ? 'YES' : 'NO'} (${medical.length} records)`);
      if (medical.length > 0) {
        console.log(`  - Allergies: ${medical[0].allergies || 'None'}`);
        console.log(`  - Chronic: ${medical[0].chronicdiseases || 'None'}`);
        console.log(`  - Medications: ${medical[0].currentmedications || 'None'}`);
      }
    }
    
    // Check table counts
    console.log('\n📊 Current table counts:\n');
    const patientCount = await sql`SELECT COUNT(*) as count FROM patients`;
    const emergencyCount = await sql`SELECT COUNT(*) as count FROM patient_emergency_contacts`;
    const insuranceCount = await sql`SELECT COUNT(*) as count FROM patient_insurance_information`;
    const medicalCount = await sql`SELECT COUNT(*) as count FROM patient_medical_information`;
    
    console.log(`Main patients table: ${patientCount[0].count} records`);
    console.log(`Emergency contacts: ${emergencyCount[0].count} records`);
    console.log(`Insurance info: ${insuranceCount[0].count} records`);
    console.log(`Medical info: ${medicalCount[0].count} records`);
    
    // Check for any recent failed transactions or issues
    console.log('\n🔍 Checking for any potential issues...\n');
    
    // Check if there are patients created in the last 5 minutes without related data
    const recentPatientsWithoutRelated = await sql`
      SELECT p.patientid, p.firstname, p.lastname, p.createdat
      FROM patients p
      LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid  
      LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
      WHERE p.createdat > NOW() - INTERVAL '5 minutes'
      AND ec.patientid IS NULL 
      AND ins.patientid IS NULL 
      AND med.patientid IS NULL
    `;
    
    if (recentPatientsWithoutRelated.length > 0) {
      console.log('⚠️  Recent patients without related data (might indicate issue):');
      recentPatientsWithoutRelated.forEach(p => {
        console.log(`- ${p.firstname} ${p.lastname} (created: ${p.createdat})`);
      });
    } else {
      console.log('✅ No recent patients without related data found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

debugNewPatientRegistration();
