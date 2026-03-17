console.log('🚀 Testing New Candidate API Approach...');
console.log('='.repeat(50));

console.log('\n✅ New Approach Benefits:');
console.log('• Dedicated API endpoint: /api/hr/candidates');
console.log('• Simplified data structure');
console.log('• Better error handling');
console.log('• Explicit field validation');
console.log('• No type wrapper needed');

console.log('\n🔧 New API Features:');
console.log('• POST /api/hr/candidates - Create candidate');
console.log('• GET /api/hr/candidates - List candidates');
console.log('• Automatic candidate_number generation');
console.log('• Required field validation');
console.log('• Data type conversion (experience_years to int)');
console.log('• Transaction handling');

console.log('\n📋 New Form Integration:');
console.log('• Direct form data submission');
console.log('• No wrapper object needed');
console.log('• Cleaner error handling');
console.log('• Better debugging');

const testNewAPI = async () => {
  try {
    console.log('\n📡 Testing new POST /api/hr/candidates...');
    
    const testData = {
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone: '+964-770-200-0001',
      gender: 'MALE',
      nationality: 'Iraqi',
      education: 'BACHELOR',
      university: 'Test University',
      specialization: 'Test Field',
      experience_years: '5',
      current_employer: 'Test Company',
      expected_salary: '2500000',
      source: 'WEBSITE',
      referral_employee: '',
      vacancy_id: 'd4781355-1013-4f6b-bc14-dac93d345289',
      resume_url: '',
      notes: 'Test applicant via new API'
    };
    
    console.log('📋 Test Data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/hr/candidates', {
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
      console.log('✅ New API Working!');
      const result = JSON.parse(responseText);
      console.log('🎉 Created candidate:', result.data.candidate_number);
    } else {
      console.log('❌ New API Error');
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
};

testNewAPI();
