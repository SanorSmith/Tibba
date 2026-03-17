// Read all data for patient ddddddddddddddddddddddd dddddddddddddddddddddddddd
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function analyzeDddddPatient() {
  try {
    console.log('🔍 Analyzing patient: ddddddddddddddddddddddd dddddddddddddddddddddddddd\n');
    
    // 1. Find the patient in the main table
    const mainPatient = await sql`
      SELECT * FROM patients 
      WHERE firstname = 'dddddddddddddddddddddd' AND lastname = 'ddddddddddddddddddddddddddddd'
    `;
    
    if (mainPatient.length === 0) {
      console.log('❌ Patient not found in main table');
      return;
    }
    
    const patient = mainPatient[0];
    console.log('📋 MAIN PATIENTS TABLE:');
    console.log(`Patient ID: ${patient.patientid}`);
    console.log(`Patient Number: ${patient.ehrid}`);
    console.log(`First Name: ${patient.firstname}`);
    console.log(`Middle Name: ${patient.middlename}`);
    console.log(`Last Name: ${patient.lastname}`);
    console.log(`Date of Birth: ${patient.dateofbirth}`);
    console.log(`Gender: ${patient.gender}`);
    console.log(`Blood Group: ${patient.bloodgroup}`);
    console.log(`National ID: ${patient.nationalid}`);
    console.log(`Phone: ${patient.phone}`);
    console.log(`Email: ${patient.email}`);
    console.log(`Address: ${patient.address}`);
    console.log(`Created: ${patient.createdat}`);
    
    // 2. Get emergency contact data
    console.log('\n📞 EMERGENCY CONTACTS TABLE:');
    const emergency = await sql`
      SELECT * FROM patient_emergency_contacts 
      WHERE patientid = ${patient.patientid}
    `;
    
    if (emergency.length > 0) {
      const e = emergency[0];
      console.log(`Contact Name: ${e.contactname}`);
      console.log(`Contact Phone: ${e.contactphone}`);
      console.log(`Relationship: ${e.relationship}`);
      console.log(`Created: ${e.createdat}`);
    } else {
      console.log('❌ No emergency contact data found');
    }
    
    // 3. Get insurance information
    console.log('\n🏥 INSURANCE INFORMATION TABLE:');
    const insurance = await sql`
      SELECT * FROM patient_insurance_information 
      WHERE patientid = ${patient.patientid}
    `;
    
    if (insurance.length > 0) {
      const i = insurance[0];
      console.log(`Insurance Company: ${i.insurancecompany}`);
      console.log(`Insurance Number: ${i.insurancenumber}`);
      console.log(`Insurance State: ${i.insurancestate}`);
      console.log(`Created: ${i.createdat}`);
    } else {
      console.log('❌ No insurance information found');
    }
    
    // 4. Get medical information
    console.log('\n🩺 MEDICAL INFORMATION TABLE:');
    const medical = await sql`
      SELECT * FROM patient_medical_information 
      WHERE patientid = ${patient.patientid}
    `;
    
    if (medical.length > 0) {
      const m = medical[0];
      console.log(`Allergies: ${m.allergies}`);
      console.log(`Chronic Diseases: ${m.chronicdiseases}`);
      console.log(`Current Medications: ${m.currentmedications}`);
      console.log(`Medical History: ${m.medicalhistory}`);
      console.log(`Created: ${m.createdat}`);
    } else {
      console.log('❌ No medical information found');
    }
    
    // 5. Test what the API returns for this patient
    console.log('\n🌐 API RESPONSE FOR THIS PATIENT:');
    const apiResult = await sql`
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
        ins.insurancestate as insurance_state,
        med.allergies,
        med.chronicdiseases as chronic_diseases,
        med.currentmedications as current_medications,
        med.medicalhistory as medical_history
      FROM patients p
      LEFT JOIN patient_emergency_contacts ec ON p.patientid = ec.patientid
      LEFT JOIN patient_insurance_information ins ON p.patientid = ins.patientid
      LEFT JOIN patient_medical_information med ON p.patientid = med.patientid
      WHERE p.patientid = ${patient.patientid}
    `;
    
    if (apiResult.length > 0) {
      const api = apiResult[0];
      console.log('📊 API Field Mapping:');
      console.log(`first_name_ar: "${api.first_name_ar}"`);
      console.log(`middle_name: "${api.middle_name}"`);
      console.log(`last_name_ar: "${api.last_name_ar}"`);
      console.log(`date_of_birth: "${api.date_of_birth}"`);
      console.log(`gender: "${api.gender}"`);
      console.log(`blood_group: "${api.blood_group}"`);
      console.log(`national_id: "${api.national_id}"`);
      console.log(`phone: "${api.phone}"`);
      console.log(`email: "${api.email}"`);
      console.log(`address: "${api.address}"`);
      console.log(`emergency_contact: "${api.emergency_contact}"`);
      console.log(`emergency_phone: "${api.emergency_phone}"`);
      console.log(`insurance_company: "${api.insurance_company}"`);
      console.log(`insurance_number: "${api.insurance_number}"`);
      console.log(`insurance_state: "${api.insurance_state}"`);
      console.log(`allergies: "${api.allergies}"`);
      console.log(`chronic_diseases: "${api.chronic_diseases}"`);
      console.log(`current_medications: "${api.current_medications}"`);
      console.log(`medical_history: "${api.medical_history}"`);
    }
    
    // 6. Compare with what the form is showing
    console.log('\n🔍 COMPARING WITH FORM DISPLAY:');
    console.log('=================================');
    
    // Form shows these fields as empty
    console.log('❌ FORM SHOWS EMPTY:');
    console.log('   - Patient ID: empty');
    console.log('   - First Name: empty'); 
    console.log('   - Middle Name: empty');
    console.log('   - Last Name: empty');
    console.log('   - Date of Birth: empty');
    console.log('   - Gender: not selected');
    console.log('   - Blood Group: not selected');
    console.log('   - National ID: empty');
    console.log('   - Insurance Company: empty');
    console.log('   - Insurance Number: empty');
    console.log('   - Emergency Contact Name: empty');
    console.log('   - Emergency Contact Phone: empty');
    console.log('   - Allergies: —');
    console.log('   - Chronic Diseases: —');
    console.log('   - Current Medications: —');
    console.log('   - Medical History: —');
    
    // Form shows these fields as populated
    console.log('✅ FORM SHOWS POPULATED:');
    console.log(`   - Phone: ${apiResult[0]?.phone || 'N/A'}`);
    console.log(`   - Email: ${apiResult[0]?.email || 'N/A'}`);
    console.log(`   - Address: ${apiResult[0]?.address || 'N/A'}`);
    
    console.log('\n💡 ANALYSIS:');
    console.log('===========');
    console.log('❌ The form is NOT receiving the API data correctly');
    console.log('❌ Only basic contact fields (phone, email, address) are showing');
    console.log('❌ All other fields are empty, suggesting the frontend is not mapping the API response');
    console.log('✅ The database has complete data');
    console.log('✅ The API query returns the correct data');
    console.log('❌ The frontend is not displaying the API response data');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

analyzeDddddPatient();
