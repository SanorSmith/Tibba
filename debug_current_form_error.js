console.log('🔍 Debugging Current Form Error...');
console.log('='.repeat(50));

console.log('\n❌ Current Issue:');
console.log('• Form is still getting 500 errors');
console.log('• API test worked but UI form is failing');
console.log('• Need to check data mismatch between form and API');

console.log('\n📋 Form Data from Logs:');
console.log('• first_name_ar: "Sanor"');
console.log('• last_name_ar: "Smith"');
console.log('• first_name_en: "Sanor"');
console.log('• middle_name: ""');
console.log('• last_name_en: "Smith"');
console.log('• + other fields...');

console.log('\n🗄️ Target Table: patients');
console.log('• patientid (UUID) - Primary Key');
console.log('• ehrid (Text) - Patient Number');
console.log('• firstname (Text)');
console.log('• middlename (Text)');
console.log('• lastname (Text)');
console.log('• dateofbirth (Date)');
console.log('• gender (Text)');
console.log('• bloodgroup (Text)');
console.log('• nationalid (Text)');
console.log('• phone (Text)');
console.log('• email (Text)');
console.log('• address (Text)');
console.log('• workspaceid (UUID)');
console.log('• createdat (Timestamp)');

console.log('\n🔍 Possible Issues:');
console.log('1. Form sending different field names than API expects');
console.log('2. Missing required fields in form data');
console.log('3. Data type mismatch (date format, etc.)');
console.log('4. Form validation not matching API requirements');

const testCurrentFormData = async () => {
  try {
    console.log('\n📡 Testing with actual form data structure...');
    
    // Test data matching what the form is sending
    const formData = {
      first_name_ar: 'Sanor',
      last_name_ar: 'Smith',
      first_name_en: 'Sanor',
      middle_name: '',
      last_name_en: 'Smith',
      date_of_birth: '1990-01-01',
      gender: 'MALE',
      blood_group: 'O+',
      phone: '+9647701234567',
      email: 'sanor@example.com',
      national_id: '1234567890',
      governorate: 'Baghdad'
    };
    
    console.log('📋 Form Data:', JSON.stringify(formData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/tibbna-openehr-patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    console.log('📊 Response Status:', response.status);
    
    const responseText = await response.text();
    console.log('📊 Response Data:', responseText);
    
    if (response.status === 200) {
      console.log('✅ Form data works!');
    } else {
      console.log('❌ Form data still failing');
      console.log('🔧 Need to investigate the error');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
};

console.log('\n🚀 Testing Form Data...');
testCurrentFormData();

console.log('\n💡 Next Steps:');
console.log('1. Check if form is sending all required fields');
console.log('2. Verify field names match API expectations');
console.log('3. Check date format in form vs API');
console.log('4. Look at server console for detailed error');

console.log('\n🔧 Debug Checklist:');
console.log('□ Check form field names vs API field names');
console.log('□ Verify required fields are present');
console.log('□ Check date format (YYYY-MM-DD)');
console.log('□ Verify phone number format');
console.log('□ Check server console for detailed error message');
