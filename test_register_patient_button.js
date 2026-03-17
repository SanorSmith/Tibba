// Test the Register Patient button by simulating form submission
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function testRegisterPatientButton() {
  try {
    console.log('🧪 Testing Register Patient button...\n');
    
    // 1. Create test patient data exactly like the form would send
    const testPatientData = {
      // Personal Information
      first_name_ar: 'TestPatient',
      last_name_ar: 'TestLastName',
      first_name_en: 'TestPatient',
      middle_name: 'TestMiddle',
      last_name_en: 'TestLastName',
      date_of_birth: '1990-01-01',
      gender: 'MALE',
      blood_group: 'A+',
      national_id: '123456789012',
      
      // Contact Information
      phone: '+9647709999999',
      email: 'testpatient@example.com',
      governorate: 'Test Governorate',
      address: 'Test Address, Baghdad, Iraq',
      
      // Emergency Contact
      emergency_contact: 'Test Emergency Contact',
      emergency_phone: '+9647708888888',
      
      // Insurance Information
      insurance_company: 'Test Insurance Company',
      insurance_number: 'TEST001-12345-2024',
      
      // Medical Information
      allergies: 'Test allergies - peanuts, shellfish',
      chronic_diseases: 'Test chronic - diabetes, hypertension',
      current_medications: 'Test medications - metformin, lisinopril',
      medical_history: 'Test medical history - previous surgeries, hospitalizations'
    };
    
    console.log('📤 Sending test patient data to API:');
    console.log(JSON.stringify(testPatientData, null, 2));
    
    // 2. Simulate the API call (same as the Register Patient button)
    const response = await fetch('http://localhost:3000/api/tibbna-openehr-patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPatientData),
    });
    
    console.log(`\n📥 API Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Registration successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      // 3. Check if the patient was created in the database
      if (result.data && result.data.id) {
        const patientId = result.data.id;
        console.log(`\n🔍 Checking database for patient ID: ${patientId}`);
        
        // Check main patients table
        const mainPatient = await sql`
          SELECT * FROM patients WHERE patientid = ${patientId}
        `;
        
        if (mainPatient.length > 0) {
          console.log('✅ Found in main patients table:');
          console.log(`   Name: ${mainPatient[0].firstname} ${mainPatient[0].lastname}`);
          console.log(`   Patient Number: ${mainPatient[0].ehrid}`);
          console.log(`   Phone: ${mainPatient[0].phone}`);
          console.log(`   Email: ${mainPatient[0].email}`);
          console.log(`   Address: ${mainPatient[0].address}`);
          console.log(`   DOB: ${mainPatient[0].dateofbirth}`);
          console.log(`   Gender: ${mainPatient[0].gender}`);
          console.log(`   Blood Group: ${mainPatient[0].bloodgroup}`);
          console.log(`   National ID: ${mainPatient[0].nationalid}`);
          console.log(`   Created: ${mainPatient[0].createdat}`);
          
          // Check emergency contacts table
          const emergency = await sql`
            SELECT * FROM patient_emergency_contacts WHERE patientid = ${patientId}
          `;
          
          console.log('\n📞 Emergency Contact Table:');
          if (emergency.length > 0) {
            console.log('✅ Emergency contact found:');
            console.log(`   Contact Name: ${emergency[0].contactname}`);
            console.log(`   Contact Phone: ${emergency[0].contactphone}`);
            console.log(`   Created: ${emergency[0].createdat}`);
          } else {
            console.log('❌ No emergency contact found');
          }
          
          // Check insurance table
          const insurance = await sql`
            SELECT * FROM patient_insurance_information WHERE patientid = ${patientId}
          `;
          
          console.log('\n🏥 Insurance Table:');
          if (insurance.length > 0) {
            console.log('✅ Insurance information found:');
            console.log(`   Insurance Company: ${insurance[0].insurancecompany}`);
            console.log(`   Insurance Number: ${insurance[0].insurancenumber}`);
            console.log(`   Created: ${insurance[0].createdat}`);
          } else {
            console.log('❌ No insurance information found');
          }
          
          // Check medical information table
          const medical = await sql`
            SELECT * FROM patient_medical_information WHERE patientid = ${patientId}
          `;
          
          console.log('\n🩺 Medical Information Table:');
          if (medical.length > 0) {
            console.log('✅ Medical information found:');
            console.log(`   Allergies: ${medical[0].allergies}`);
            console.log(`   Chronic Diseases: ${medical[0].chronicdiseases}`);
            console.log(`   Current Medications: ${medical[0].currentmedications}`);
            console.log(`   Medical History: ${medical[0].medicalhistory}`);
            console.log(`   Created: ${medical[0].createdat}`);
          } else {
            console.log('❌ No medical information found');
          }
          
          // 4. Summary
          console.log('\n📊 REGISTRATION TEST SUMMARY:');
          console.log('============================');
          console.log(`✅ Main Patient Record: ${mainPatient.length > 0 ? 'CREATED' : 'FAILED'}`);
          console.log(`✅ Emergency Contact: ${emergency.length > 0 ? 'CREATED' : 'FAILED'}`);
          console.log(`✅ Insurance Info: ${insurance.length > 0 ? 'CREATED' : 'FAILED'}`);
          console.log(`✅ Medical Info: ${medical.length > 0 ? 'CREATED' : 'FAILED'}`);
          
          const allTablesCreated = mainPatient.length > 0 && emergency.length > 0 && insurance.length > 0 && medical.length > 0;
          console.log(`\n🎯 Overall Status: ${allTablesCreated ? '✅ ALL TABLES UPDATED CORRECTLY' : '❌ SOME TABLES FAILED'}`);
          
          if (allTablesCreated) {
            console.log('\n💡 The Register Patient button is working perfectly!');
            console.log('   All data was saved to all 4 tables correctly.');
          }
          
        } else {
          console.log('❌ Patient NOT found in main table!');
        }
      }
    } else {
      const error = await response.json();
      console.log('❌ Registration failed!');
      console.log('Error:', JSON.stringify(error, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await sql.end();
  }
}

testRegisterPatientButton();
