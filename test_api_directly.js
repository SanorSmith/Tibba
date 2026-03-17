// Test API endpoints directly
const testAPI = async () => {
  try {
    console.log('🧪 Testing API Endpoints Directly...');
    
    // Test 1: Get all vacancies
    console.log('\n1️⃣ Testing /api/hr/recruitment?type=vacancies');
    const vacanciesResponse = await fetch('http://localhost:3000/api/hr/recruitment?type=vacancies');
    const vacanciesData = await vacanciesResponse.json();
    console.log('Status:', vacanciesResponse.status);
    console.log('Data:', vacanciesData);
    
    if (vacanciesData.success && vacanciesData.data.length > 0) {
      console.log('✅ Vacancies API working!');
      console.log('First vacancy ID:', vacanciesData.data[0].id);
      
      // Test 2: Get candidates
      console.log('\n2️⃣ Testing /api/hr/recruitment?type=candidates');
      const candidatesResponse = await fetch('http://localhost:3000/api/hr/recruitment?type=candidates');
      const candidatesData = await candidatesResponse.json();
      console.log('Status:', candidatesResponse.status);
      console.log('Data:', candidatesData);
      
      if (candidatesData.success) {
        console.log('✅ Candidates API working!');
        
        // Test 3: Try accessing vacancy detail page
        const testId = vacanciesData.data[0].id;
        console.log('\n3️⃣ Testing vacancy detail page with ID:', testId);
        console.log('Navigate to: http://localhost:3000/hr/recruitment/vacancies/' + testId);
        
        return { success: true, testId };
      }
    }
    
    return { success: false };
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
    return { success: false, error: error.message };
  }
};

// Run the test
testAPI().then(result => {
  if (result.success) {
    console.log('\n🎉 API Test Successful!');
    console.log('Try this URL in browser:');
    console.log('http://localhost:3000/hr/recruitment/vacancies/' + result.testId);
  } else {
    console.log('\n❌ API Test Failed!');
    console.log('Error:', result.error);
    console.log('Check server console for errors');
  }
});
