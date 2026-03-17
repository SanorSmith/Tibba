console.log('🔧 Testing Fixed Patient API...');
console.log('='.repeat(50));

console.log('\n✅ API Fixes Applied:');
console.log('• Fixed INSERT query to use correct column names');
console.log('• Changed "id" to "patientid" (primary key)');
console.log('• Updated field mapping to match database schema');
console.log('• Fixed response transformation');
console.log('• Aligned with actual database table structure');

console.log('\n🔧 Database Schema Alignment:');
console.log('• patientid (UUID) - Primary Key');
console.log('• ehrid (Text) - Patient Number');
console.log('• firstname (Text) - First Name');
console.log('• middlename (Text) - Middle Name');
console.log('• lastname (Text) - Last Name');
console.log('• dateofbirth (Date) - Date of Birth');
console.log('• gender (Text) - Gender');
console.log('• bloodgroup (Text) - Blood Group');
console.log('• nationalid (Text) - National ID');
console.log('• phone (Text) - Phone');
console.log('• email (Text) - Email');
console.log('• address (Text) - Address');
console.log('• medical_history (Text) - Medical History');
console.log('• createdat (Timestamp) - Created At');

const testFixedAPI = async () => {
  try {
    console.log('\n📡 Testing Fixed POST /api/tibbna-openehr-patients...');
    
    const testData = {
      first_name_ar: 'Test',
      last_name_ar: 'Patient',
      first_name_en: 'Test',
      middle_name: '',
      last_name_en: 'Patient',
      date_of_birth: '1990-01-01',
      gender: 'MALE',
      blood_group: 'O+',
      phone: '+9647701234567',
      email: 'test@example.com',
      national_id: '1234567890',
      governorate: 'Baghdad',
      medical_history: 'Test patient - fixed API'
    };
    
    console.log('📋 Test Data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/tibbna-openehr-patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📊 Response Status:', response.status);
    
    const responseText = await response.text();
    console.log('📊 Response Data:', responseText);
    
    if (response.status === 200) {
      console.log('✅ API Fixed and Working!');
      const result = JSON.parse(responseText);
      console.log('🎉 Created patient:', result.data.patient_number);
    } else {
      console.log('❌ API Still Has Issues');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
};

console.log('\n🚀 Testing Fixed API...');
testFixedAPI();

console.log('\n💡 Expected Result:');
console.log('✅ Patient created successfully');
console.log('✅ No more 500 errors');
console.log('✅ Form should work in the UI');
console.log('✅ Data saved to database');

console.log('\n🎯 Next Steps:');
console.log('1. Test the patient registration form in the UI');
console.log('2. Verify patient appears in the patient list');
console.log('3. Check database for new patient record');
console.log('4. Test search functionality');
