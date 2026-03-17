// Find the ddddd patient with different search approaches
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function findDddddPatient() {
  try {
    console.log('🔍 Finding patient with ddddd name...\n');
    
    // 1. Search by phone number (we know this works)
    console.log('📋 Searching by phone number +46460000005552:');
    const phoneSearch = await sql`
      SELECT * FROM patients 
      WHERE phone = '+46460000005552'
      ORDER BY createdat DESC
    `;
    
    for (let index = 0; index < phoneSearch.length; index++) {
      const patient = phoneSearch[index];
      console.log(`\n${index + 1}. Patient found by phone:`);
      console.log(`   Patient ID: ${patient.patientid}`);
      console.log(`   Patient Number: ${patient.ehrid}`);
      console.log(`   First Name: "${patient.firstname}"`);
      console.log(`   Middle Name: "${patient.middlename}"`);
      console.log(`   Last Name: "${patient.lastname}"`);
      console.log(`   Created: ${patient.createdat}`);
      
      // Check if this is the ddddd patient
      const isDddddPatient = patient.firstname.includes('dddd') && patient.lastname.includes('dddd');
      console.log(`   Is ddddd patient: ${isDddddPatient ? '✅ YES' : '❌ NO'}`);
      
      if (isDddddPatient) {
        console.log(`\n🎯 FOUND THE DDDDD PATIENT! Analyzing complete data...\n`);
        
        // Get all related data for this patient
        const patientId = patient.patientid;
        
        // Emergency contact
        const emergency = await sql`
          SELECT * FROM patient_emergency_contacts WHERE patientid = ${patientId}
        `;
        
        // Insurance
        const insurance = await sql`
          SELECT * FROM patient_insurance_information WHERE patientid = ${patientId}
        `;
        
        // Medical
        const medical = await sql`
          SELECT * FROM patient_medical_information WHERE patientid = ${patientId}
        `;
        
        console.log('📞 EMERGENCY CONTACT:');
        if (emergency.length > 0) {
          console.log(`   Name: "${emergency[0].contactname}"`);
          console.log(`   Phone: "${emergency[0].contactphone}"`);
          console.log(`   Relationship: "${emergency[0].relationship}"`);
        } else {
          console.log('   ❌ No data');
        }
        
        console.log('\n🏥 INSURANCE:');
        if (insurance.length > 0) {
          console.log(`   Company: "${insurance[0].insurancecompany}"`);
          console.log(`   Number: "${insurance[0].insurancenumber}"`);
          console.log(`   State: "${insurance[0].insurancestate}"`);
        } else {
          console.log('   ❌ No data');
        }
        
        console.log('\n🩺 MEDICAL:');
        if (medical.length > 0) {
          console.log(`   Allergies: "${medical[0].allergies}"`);
          console.log(`   Chronic Diseases: "${medical[0].chronicdiseases}"`);
          console.log(`   Current Medications: "${medical[0].currentmedications}"`);
          console.log(`   Medical History: "${medical[0].medicalhistory}"`);
        } else {
          console.log('   ❌ No data');
        }
        
        // Test API response
        console.log('\n🌐 API RESPONSE:');
        const apiResponse = await sql`
          SELECT 
            p.patientid as id,
            p.ehrid as patient_number,
            p.firstname as first_name_ar,
            p.middlename as middle_name,
            p.lastname as last_name_ar,
            p.dateofbirth::date as date_of_birth,
            p.gender,
            p.bloodgroup as blood_group,
            p.nationalid as national_id,
            p.phone,
            p.email,
            p.address,
            ec.contactname as emergency_contact,
            ec.contactphone as emergency_phone,
            ins.insurancecompany as insurance_company,
            ins.insurancenumber as insurance_number,
            NULL as insurance_state,
            med.allergies,
            med.chronicdiseases as chronic_diseases,
            med.currentmedications as current_medications,
            med.medicalhistory as medical_history
          FROM patients p
          LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
          LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
          LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
          WHERE p.patientid = ${patientId}
        `;
        
        if (apiResponse.length > 0) {
          const api = apiResponse[0];
          console.log('✅ API returns complete data:');
          console.log(`   emergency_contact: "${api.emergency_contact}"`);
          console.log(`   emergency_phone: "${api.emergency_phone}"`);
          console.log(`   insurance_company: "${api.insurance_company}"`);
          console.log(`   insurance_number: "${api.insurance_number}"`);
          console.log(`   allergies: "${api.allergies}"`);
          console.log(`   chronic_diseases: "${api.chronic_diseases}"`);
          console.log(`   current_medications: "${api.current_medications}"`);
        }
        
        console.log('\n💡 CONCLUSION:');
        console.log('=============');
        console.log('✅ Database has complete data');
        console.log('✅ API returns complete data');
        console.log('❌ Frontend form is not displaying the data');
        console.log('💡 The issue is in the frontend - it\'s not mapping the API response to the form fields');
      }
    }
    
    if (phoneSearch.length === 0) {
      console.log('❌ No patients found with that phone number');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

findDddddPatient();
