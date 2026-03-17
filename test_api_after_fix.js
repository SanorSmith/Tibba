console.log('🧪 Testing API After Fix...');
console.log('='.repeat(50));

const testAPI = async () => {
  try {
    console.log('\n📡 Testing POST /api/hr/recruitment with candidate data...');
    
    const testData = {
      type: 'candidate',
      data: {
        candidate_number: 'CAND-2026-999',
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
        notes: 'Test applicant created via API'
      }
    };
    
    console.log('📋 Test Data:', JSON.stringify(testData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/hr/recruitment', {
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
      console.log('✅ API Working! The issue might be with the frontend form data.');
    } else {
      console.log('❌ API Still Has Issues');
    }
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
};

testAPI();
