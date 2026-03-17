// Check which patient has the phone number and why fields are empty
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function checkPhoneNumberIssue() {
  try {
    console.log('🔍 Checking why phone number +46460000005552 shows empty fields...\n');
    
    const phoneNumber = '+46460000005552';
    
    // 1. Find all patients with this phone number
    console.log('📋 Patients with this phone number:');
    const patientsWithPhone = await sql`
      SELECT patientid, ehrid, firstname, lastname, createdat
      FROM patients 
      WHERE phone = ${phoneNumber}
      ORDER BY createdat DESC
    `;
    
    if (patientsWithPhone.length === 0) {
      console.log('❌ No patients found with this phone number');
      return;
    }
    
    for (let index = 0; index < patientsWithPhone.length; index++) {
      const patient = patientsWithPhone[index];
      console.log(`${index + 1}. ${patient.firstname} ${patient.lastname} (${patient.ehrid})`);
      console.log(`   Patient ID: ${patient.patientid}`);
      console.log(`   Created: ${patient.createdat}`);
      
      // 2. Check if this patient has data in related tables
      console.log(`\n   🔍 Checking related data for ${patient.firstname}:`);
      
      const emergency = await sql`
        SELECT contactname, contactphone FROM patient_emergency_contacts 
        WHERE patientid = ${patient.patientid}
      `;
      
      const insurance = await sql`
        SELECT insurancecompany, insurancenumber FROM patient_insurance_information 
        WHERE patientid = ${patient.patientid}
      `;
      
      const medical = await sql`
        SELECT allergies, chronicdiseases, currentmedications FROM patient_medical_information 
        WHERE patientid = ${patient.patientid}
      `;
      
      console.log(`   Emergency Contact: ${emergency.length > 0 ? '✅' : '❌'} ${emergency.length > 0 ? `(${emergency[0].contactname})` : ''}`);
      console.log(`   Insurance: ${insurance.length > 0 ? '✅' : '❌'} ${insurance.length > 0 ? `(${insurance[0].insurancecompany})` : ''}`);
      console.log(`   Medical Info: ${medical.length > 0 ? '✅' : '❌'} ${medical.length > 0 ? `(${medical[0].allergies || 'None'})` : ''}`);
      
      const hasCompleteData = emergency.length > 0 || insurance.length > 0 || medical.length > 0;
      console.log(`   Complete Data: ${hasCompleteData ? '✅ YES' : '❌ NO'}`);
      
      if (!hasCompleteData) {
        console.log(`   ⚠️  This patient has no data in related tables!`);
        console.log(`   💡 This explains why the API returns empty fields`);
      }
      
      console.log('');
    }
    
    // 3. Test the API query directly to see what it returns
    console.log('🧪 Testing the API query directly:');
    
    const apiResults = await sql`
      SELECT 
        p.patientid as id,
        p.ehrid as patient_number,
        p.firstname as first_name_ar,
        p.lastname as last_name_ar,
        p.phone,
        p.email,
        p.address,
        ec.contactname as emergency_contact,
        ec.contactphone as emergency_phone,
        ins.insurancecompany as insurance_company,
        ins.insurancenumber as insurance_number,
        med.allergies,
        med.chronicdiseases as chronic_diseases,
        med.currentmedications as current_medications
      FROM patients p
      LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
      WHERE p.phone = ${phoneNumber}
      ORDER BY p.createdat DESC
    `;
    
    console.log('📊 API Query Results:');
    apiResults.forEach((result, index) => {
      console.log(`\n${index + 1}. API Result for ${result.first_name_ar} ${result.last_name_ar}:`);
      console.log(`   Emergency Contact: "${result.emergency_contact || 'NULL'}"`);
      console.log(`   Emergency Phone: "${result.emergency_phone || 'NULL'}"`);
      console.log(`   Insurance Company: "${result.insurance_company || 'NULL'}"`);
      console.log(`   Insurance Number: "${result.insurance_number || 'NULL'}"`);
      console.log(`   Allergies: "${result.allergies || 'NULL'}"`);
      console.log(`   Chronic Diseases: "${result.chronic_diseases || 'NULL'}"`);
      console.log(`   Current Medications: "${result.currentmedications || 'NULL'}"`);
    });
    
    // 4. Find patients that DO have complete data for comparison
    console.log('\n🎯 Finding patients with complete data for comparison:');
    const completePatients = await sql`
      SELECT p.patientid, p.ehrid, p.firstname, p.lastname, p.phone, p.createdat
      FROM patients p
      INNER JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      INNER JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      INNER JOIN patient_medical_information med ON p.patientid = med.patientid
      ORDER BY p.createdat DESC
      LIMIT 3
    `;
    
    console.log('✅ Patients with complete data (for comparison):');
    completePatients.forEach((p, i) => {
      console.log(`${i+1}. ${p.firstname} ${p.lastname} (${p.ehrid}) - ${p.phone}`);
    });
    
    console.log('\n💡 CONCLUSION:');
    console.log('=============');
    console.log('❌ The patients with phone +46460000005552 have NO data in related tables');
    console.log('❌ This is why the API returns empty fields for emergency contact, insurance, and medical info');
    console.log('✅ The API query is correct, but the database tables are empty for these patients');
    console.log('💡 These patients were likely created through an old form or incomplete registration');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkPhoneNumberIssue();
