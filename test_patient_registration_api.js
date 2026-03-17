// Test the patient registration API directly
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function testPatientRegistrationAPI() {
  try {
    console.log('🧪 Testing patient registration API directly...\n');
    
    // Create test patient data exactly like the frontend sends
    const testPatientData = {
      // Personal Information
      first_name_ar: 'Test',
      last_name_ar: 'Patient',
      first_name_en: 'Test',
      middle_name: '',
      last_name_en: 'Patient',
      date_of_birth: '1990-01-01',
      gender: 'MALE',
      blood_group: 'A+',
      national_id: '123456789012',
      
      // Contact Information
      phone: '+9647700000001',
      email: 'testpatient@example.com',
      governorate: 'Baghdad',
      address: 'Test Address, Baghdad, Iraq',
      
      // Emergency Contact
      emergency_contact: 'Emergency Contact Name',
      emergency_phone: '+9647700000002',
      
      // Insurance Information
      insurance_company: 'Test Insurance Company',
      insurance_number: 'TEST001-12345-2024',
      
      // Medical Information
      allergies: 'Test allergies',
      chronic_diseases: 'Test chronic diseases',
      current_medications: 'Test medications',
      medical_history: 'Test medical history'
    };
    
    console.log('📤 Sending test patient data:');
    console.log(JSON.stringify(testPatientData, null, 2));
    console.log('\n');
    
    // Simulate the API call
    const response = await fetch('http://localhost:3000/api/tibbna-openehr-patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPatientData),
    });
    
    console.log('📥 API Response Status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Registration successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
      
      // Check if the patient was actually created in the database
      if (result.data && result.data.id) {
        console.log('\n🔍 Verifying patient in database...\n');
        
        const patient = await sql`
          SELECT * FROM patients WHERE patientid = ${result.data.id}
        `;
        
        if (patient.length > 0) {
          console.log('✅ Patient found in main table');
          console.log(`Name: ${patient[0].firstname} ${patient[0].lastname}`);
          console.log(`Phone: ${patient[0].phone}`);
          
          // Check related tables
          const emergency = await sql`
            SELECT * FROM patient_emergency_contacts WHERE patientid = ${result.data.id}
          `;
          
          const insurance = await sql`
            SELECT * FROM patient_insurance_information WHERE patientid = ${result.data.id}
          `;
          
          const medical = await sql`
            SELECT * FROM patient_medical_information WHERE patientid = ${result.data.id}
          `;
          
          console.log(`Emergency Contact: ${emergency.length > 0 ? '✅ Found' : '❌ Not found'}`);
          console.log(`Insurance: ${insurance.length > 0 ? '✅ Found' : '❌ Not found'}`);
          console.log(`Medical Info: ${medical.length > 0 ? '✅ Found' : '❌ Not found'}`);
          
          if (emergency.length > 0) {
            console.log(`  - Emergency Name: ${emergency[0].contactname}`);
            console.log(`  - Emergency Phone: ${emergency[0].contactphone}`);
          }
          
          if (insurance.length > 0) {
            console.log(`  - Insurance Company: ${insurance[0].insurancecompany}`);
            console.log(`  - Insurance Number: ${insurance[0].insurancenumber}`);
          }
          
          if (medical.length > 0) {
            console.log(`  - Allergies: ${medical[0].allergies}`);
            console.log(`  - Chronic Diseases: ${medical[0].chronicdiseases}`);
            console.log(`  - Current Medications: ${medical[0].currentmedications}`);
          }
        } else {
          console.log('❌ Patient NOT found in database!');
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

testPatientRegistrationAPI();
