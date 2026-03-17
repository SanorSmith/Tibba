// Check the specific "ffffffffffffffffff" patient in all tables
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function checkFFFFFFFFPatient() {
  try {
    console.log('🔍 Checking "ffffffffffffffffff" patient in all tables...\n');
    
    // Find the patient in the main table
    const mainPatient = await sql`
      SELECT * FROM patients 
      WHERE firstname ILIKE '%ffffffff%' 
      ORDER BY createdat DESC 
      LIMIT 1
    `;
    
    if (mainPatient.length === 0) {
      console.log('❌ Patient not found in main table');
      return;
    }
    
    const patient = mainPatient[0];
    console.log('✅ Found patient in main table:');
    console.log(`ID: ${patient.patientid}`);
    console.log(`Patient Number: ${patient.ehrid}`);
    console.log(`Name: ${patient.firstname} ${patient.lastname}`);
    console.log(`Phone: ${patient.phone}`);
    console.log(`Email: ${patient.email}`);
    console.log(`Address: ${patient.address}`);
    console.log(`Date of Birth: ${patient.dateofbirth}`);
    console.log(`Gender: ${patient.gender}`);
    console.log(`Blood Group: ${patient.bloodgroup}`);
    console.log(`National ID: ${patient.nationalid}`);
    console.log(`Created: ${patient.createdat}\n`);
    
    // Check emergency contact
    console.log('📞 Emergency Contact Table:');
    const emergency = await sql`
      SELECT * FROM patient_emergency_contacts 
      WHERE patientid = ${patient.patientid}
    `;
    
    if (emergency.length > 0) {
      console.log('✅ Emergency contact found:');
      console.log(`  Contact Name: ${emergency[0].contactname}`);
      console.log(`  Contact Phone: ${emergency[0].contactphone}`);
      console.log(`  Created: ${emergency[0].createdat}`);
    } else {
      console.log('❌ No emergency contact found');
    }
    
    // Check insurance information
    console.log('\n🏥 Insurance Information Table:');
    const insurance = await sql`
      SELECT * FROM patient_insurance_information 
      WHERE patientid = ${patient.patientid}
    `;
    
    if (insurance.length > 0) {
      console.log('✅ Insurance information found:');
      console.log(`  Insurance Company: ${insurance[0].insurancecompany}`);
      console.log(`  Insurance Number: ${insurance[0].insurancenumber}`);
      console.log(`  Created: ${insurance[0].createdat}`);
    } else {
      console.log('❌ No insurance information found');
    }
    
    // Check medical information
    console.log('\n🩺 Medical Information Table:');
    const medical = await sql`
      SELECT * FROM patient_medical_information 
      WHERE patientid = ${patient.patientid}
    `;
    
    if (medical.length > 0) {
      console.log('✅ Medical information found:');
      console.log(`  Allergies: ${medical[0].allergies || 'None'}`);
      console.log(`  Chronic Diseases: ${medical[0].chronicdiseases || 'None'}`);
      console.log(`  Current Medications: ${medical[0].currentmedications || 'None'}`);
      console.log(`  Medical History: ${medical[0].medicalhistory || 'None'}`);
      console.log(`  Created: ${medical[0].createdat}`);
    } else {
      console.log('❌ No medical information found');
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`Main Patient Record: ✅ EXISTS`);
    console.log(`Emergency Contact: ${emergency.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`Insurance Information: ${insurance.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`Medical Information: ${medical.length > 0 ? '✅ EXISTS' : '❌ MISSING'}`);
    
    console.log('\n🎯 This patient should show complete data in the patient detail view!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkFFFFFFFFPatient();
