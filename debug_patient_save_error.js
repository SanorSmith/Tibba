console.log('🔍 Debugging Patient Save 500 Error...');
console.log('='.repeat(50));

console.log('\n❌ Error Details:');
console.log('• POST /api/tibbna-openehr-patients - 500 Internal Server Error');
console.log('• Form data is being logged correctly');
console.log('• API endpoint exists but failing');

console.log('\n🔍 Possible Causes:');
console.log('1. Database connection issue');
console.log('2. SQL query error in patient creation');
console.log('3. Missing required fields in database');
console.log('4. Foreign key constraint violation');
console.log('5. Data type mismatch between form and database');
console.log('6. Missing database table columns');

console.log('\n🔧 Debug Steps:');
console.log('1. Check API endpoint: /api/tibbna-openehr-patients');
console.log('2. Check database table structure');
console.log('3. Check form data mapping');
console.log('4. Test API directly');

const testPatientAPI = async () => {
  try {
    console.log('\n📡 Testing POST /api/tibbna-openehr-patients...');
    
    // Test data matching the form structure
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
      medical_history: 'Test patient'
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
      console.log('✅ API Working!');
    } else {
      console.log('❌ API Error - Need to investigate');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
};

const checkDatabaseStructure = async () => {
  try {
    console.log('\n🗄️ Checking Database Structure...');
    
    // This would check the actual database table structure
    console.log('📋 Expected Patient Table Columns:');
    console.log('• patientid (UUID/Text) - Primary Key');
    console.log('• firstname (Text)');
    console.log('• lastname (Text)');
    console.log('• dateofbirth (Date)');
    console.log('• gender (Text)');
    console.log('• blood_group (Text)');
    console.log('• phone (Text)');
    console.log('• email (Text)');
    console.log('• nationalid (Text)');
    console.log('• address (Text)');
    console.log('• medical_history (Text)');
    console.log('• createdat (Timestamp)');
    
  } catch (error) {
    console.error('❌ Database Check Error:', error.message);
  }
};

console.log('\n🚀 Running Debug Tests...');
testPatientAPI();
checkDatabaseStructure();

console.log('\n💡 Next Steps:');
console.log('1. Check the API endpoint logs for detailed error');
console.log('2. Verify database table exists with correct columns');
console.log('3. Check if all required fields are being sent');
console.log('4. Verify data types match database expectations');
console.log('5. Check database connection string');

console.log('\n🔧 Quick Fix Checklist:');
console.log('□ Check API server logs for detailed error message');
console.log('□ Verify database table: patients or patient table');
console.log('□ Check column names: firstname vs first_name_ar');
console.log('□ Verify required fields are not null');
console.log('□ Check data types: date format, text length limits');
console.log('□ Test database connection');
