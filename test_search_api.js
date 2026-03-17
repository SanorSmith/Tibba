// Test the search API to see if it returns complete data
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
});

async function testSearchAPI() {
  try {
    console.log('🔍 Testing the search API endpoint...\n');
    
    // Test the actual API endpoint that the frontend calls
    const searchTerm = '+46460000005552'; // The phone number from your HTML
    
    console.log(`📤 Searching for: "${searchTerm}"`);
    console.log(`📡 API Call: GET /api/tibbna-openehr-patients?search=${encodeURIComponent(searchTerm)}`);
    
    const response = await fetch(`http://localhost:3000/api/tibbna-openehr-patients?search=${encodeURIComponent(searchTerm)}`);
    
    console.log(`📥 API Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ API Response received:');
      console.log(JSON.stringify(result, null, 2));
      
      // Check if the response has the expected fields
      if (result.data && Array.isArray(result.data)) {
        console.log('\n📊 Analyzing search results:');
        
        result.data.forEach((patient, index) => {
          console.log(`\n=== Patient ${index + 1} ===`);
          console.log(`Name: ${patient.full_name_ar || patient.firstname || 'N/A'}`);
          console.log(`Patient Number: ${patient.ehrid || 'N/A'}`);
          console.log(`Phone: ${patient.phone || 'N/A'}`);
          
          // Check for the fields that should be populated
          console.log('\n🔍 Checking for complete data fields:');
          console.log(`Emergency Contact: ${patient.emergency_contact || '❌ EMPTY'}`);
          console.log(`Emergency Phone: ${patient.emergency_phone || '❌ EMPTY'}`);
          console.log(`Insurance Company: ${patient.insurance_company || '❌ EMPTY'}`);
          console.log(`Insurance Number: ${patient.insurance_number || '❌ EMPTY'}`);
          console.log(`Allergies: ${patient.allergies || '❌ EMPTY'}`);
          console.log(`Chronic Diseases: ${patient.chronic_diseases || '❌ EMPTY'}`);
          console.log(`Current Medications: ${patient.current_medications || '❌ EMPTY'}`);
          console.log(`Medical History: ${patient.medical_history || '❌ EMPTY'}`);
          
          const hasCompleteData = patient.emergency_contact || patient.emergency_phone || 
                                  patient.insurance_company || patient.insurance_number ||
                                  patient.allergies || patient.chronic_diseases || patient.current_medications;
          
          console.log(`Complete Data: ${hasCompleteData ? '✅ YES' : '❌ NO'}`);
        });
        
        // Find the patient that matches the phone number
        const matchingPatient = result.data.find(p => p.phone === searchTerm);
        if (matchingPatient) {
          console.log('\n🎯 Found matching patient for phone number:');
          console.log(`Name: ${matchingPatient.full_name_ar || matchingPatient.firstname}`);
          console.log(`Patient ID: ${matchingPatient.patientid}`);
          console.log(`Has complete data: ${matchingPatient.emergency_contact || matchingPatient.emergency_phone || matchingPatient.insurance_company ? '✅ YES' : '❌ NO'}`);
          
          // Check if this patient actually has data in the database
          console.log('\n🔍 Verifying this patient has data in database:');
          const emergencyCount = await sql`
            SELECT COUNT(*) as count FROM patient_emergency_contacts 
            WHERE patientid = ${matchingPatient.patientid}
          `;
          
          const insuranceCount = await sql`
            SELECT COUNT(*) as count FROM patient_insurance_information 
            WHERE patientid = ${matchingPatient.patientid}
          `;
          
          const medicalCount = await sql`
            SELECT COUNT(*) as count FROM patient_medical_information 
            WHERE patientid = ${matchingPatient.patientid}
          `;
          
          console.log(`Database - Emergency: ${emergencyCount[0].count} records`);
          console.log(`Database - Insurance: ${insuranceCount[0].count} records`);
          console.log(`Database - Medical: ${medicalCount[0].count} records`);
          
          const dbHasData = emergencyCount[0].count > 0 || insuranceCount[0].count > 0 || medicalCount[0].count > 0;
          console.log(`Database has data: ${dbHasData ? '✅ YES' : '❌ NO'}`);
          
          if (!dbHasData) {
            console.log('\n❌ ISSUE: Patient exists in API response but has no data in related tables');
            console.log('💡 This patient was likely created through the old form without complete data');
          } else if (!hasCompleteData) {
            console.log('\n❌ ISSUE: Database has data but API is not returning it');
            console.log('💡 The API GET endpoint may have a problem with the JOIN queries');
          } else {
            console.log('\n✅ SUCCESS: Both database and API have complete data');
          }
        }
        
      } else {
        console.log('❌ API response format is unexpected');
      }
      
    } else {
      const error = await response.json();
      console.log('❌ API call failed:');
      console.log(JSON.stringify(error, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing search API:', error);
  } finally {
    await sql.end();
  }
}

testSearchAPI();
