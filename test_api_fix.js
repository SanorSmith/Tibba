// Test if the API fix works correctly
async function testAPIFix() {
  try {
    console.log('🧪 Testing API fix for patient search...\n');
    
    // Test searching for the ddddd patient
    const searchTerm = 'ddddddddddddddddddddddd';
    console.log(`📤 Searching for: "${searchTerm}"`);
    
    const response = await fetch(`http://localhost:3000/api/tibbna-openehr-patients?search=${encodeURIComponent(searchTerm)}`);
    
    console.log(`📥 Response Status: ${response.status}`);
    
    if (response.ok) {
      const result = await response.json();
      
      if (result.data && result.data.length > 0) {
        const patient = result.data[0];
        
        console.log('\n✅ API Response received. Checking fields:\n');
        
        // Check all the fields the frontend expects
        console.log('📋 PERSONAL INFORMATION:');
        console.log(`   patient_id: ${patient.patient_id ? '✅' : '❌'} "${patient.patient_id || 'MISSING'}"`);
        console.log(`   patient_number: ${patient.patient_number ? '✅' : '❌'} "${patient.patient_number || 'MISSING'}"`);
        console.log(`   first_name_ar: ${patient.first_name_ar ? '✅' : '❌'} "${patient.first_name_ar || 'MISSING'}"`);
        console.log(`   middle_name: ${patient.middle_name ? '✅' : '❌'} "${patient.middle_name || 'MISSING'}"`);
        console.log(`   last_name_ar: ${patient.last_name_ar ? '✅' : '❌'} "${patient.last_name_ar || 'MISSING'}"`);
        console.log(`   date_of_birth: ${patient.date_of_birth ? '✅' : '❌'} "${patient.date_of_birth || 'MISSING'}"`);
        console.log(`   gender: ${patient.gender ? '✅' : '❌'} "${patient.gender || 'MISSING'}"`);
        console.log(`   blood_group: ${patient.blood_group ? '✅' : '❌'} "${patient.blood_group || 'MISSING'}"`);
        console.log(`   national_id: ${patient.national_id ? '✅' : '❌'} "${patient.national_id || 'MISSING'}"`);
        
        console.log('\n📞 CONTACT INFORMATION:');
        console.log(`   phone: ${patient.phone ? '✅' : '❌'} "${patient.phone || 'MISSING'}"`);
        console.log(`   email: ${patient.email ? '✅' : '❌'} "${patient.email || 'MISSING'}"`);
        console.log(`   address: ${patient.address ? '✅' : '❌'} "${patient.address || 'MISSING'}"`);
        
        console.log('\n🚨 EMERGENCY CONTACT:');
        console.log(`   emergency_contact: ${patient.emergency_contact ? '✅' : '❌'} "${patient.emergency_contact || 'MISSING'}"`);
        console.log(`   emergency_phone: ${patient.emergency_phone ? '✅' : '❌'} "${patient.emergency_phone || 'MISSING'}"`);
        
        console.log('\n🏥 INSURANCE:');
        console.log(`   insurance_company: ${patient.insurance_company ? '✅' : '❌'} "${patient.insurance_company || 'MISSING'}"`);
        console.log(`   insurance_number: ${patient.insurance_number ? '✅' : '❌'} "${patient.insurance_number || 'MISSING'}"`);
        
        console.log('\n🩺 MEDICAL INFORMATION:');
        console.log(`   allergies: ${patient.allergies ? '✅' : '❌'} "${patient.allergies || 'MISSING'}"`);
        console.log(`   chronic_diseases: ${patient.chronic_diseases ? '✅' : '❌'} "${patient.chronic_diseases || 'MISSING'}"`);
        console.log(`   current_medications: ${patient.current_medications ? '✅' : '❌'} "${patient.current_medications || 'MISSING'}"`);
        console.log(`   medical_history: ${patient.medical_history ? '✅' : '❌'} "${patient.medical_history || 'MISSING'}"`);
        
        // Count how many fields are present
        const requiredFields = [
          'patient_id', 'patient_number', 'first_name_ar', 'middle_name', 'last_name_ar',
          'date_of_birth', 'gender', 'blood_group', 'national_id', 'phone', 'email', 'address',
          'emergency_contact', 'emergency_phone', 'insurance_company', 'insurance_number',
          'allergies', 'chronic_diseases', 'current_medications', 'medical_history'
        ];
        
        const presentFields = requiredFields.filter(field => patient[field] !== undefined && patient[field] !== null);
        const missingFields = requiredFields.filter(field => patient[field] === undefined || patient[field] === null);
        
        console.log('\n📊 SUMMARY:');
        console.log(`   Total fields checked: ${requiredFields.length}`);
        console.log(`   Fields present: ${presentFields.length}`);
        console.log(`   Fields missing: ${missingFields.length}`);
        
        if (missingFields.length > 0) {
          console.log(`\n❌ Missing fields: ${missingFields.join(', ')}`);
        }
        
        if (presentFields.length === requiredFields.length) {
          console.log('\n✅ SUCCESS! All required fields are present in the API response');
          console.log('✅ The frontend should now display all patient data correctly');
        } else {
          console.log('\n⚠️  Some fields are still missing from the API response');
        }
        
      } else {
        console.log('❌ No patients found in response');
      }
    } else {
      console.log('❌ API request failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAPIFix();
