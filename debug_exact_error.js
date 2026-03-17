console.log('🔍 Debugging Exact Error Message...');
console.log('='.repeat(50));

const testExactError = async () => {
  try {
    console.log('\n📡 Testing POST /api/tibbna-openehr-patients with exact form data...');
    
    // Exact data from the logs
    const exactFormData = {
      first_name_ar: 'wwwwwwwwwwww',
      last_name_ar: 'wwwwwwwwwwwwww',
      first_name_en: 'wwwwwwwwwwww',
      middle_name: 'wwwwwwwwwww',
      last_name_en: 'wwwwwwwwwwwwww',
      date_of_birth: '1990-01-01',
      gender: 'MALE',
      blood_group: 'O+',
      phone: '+9647701234567',
      email: 'test@example.com',
      national_id: '1234567890',
      governorate: 'Baghdad'
    };
    
    console.log('📋 Exact Form Data:', JSON.stringify(exactFormData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/tibbna-openehr-patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exactFormData)
    });
    
    console.log('📊 Response Status:', response.status);
    
    const responseText = await response.text();
    console.log('📊 Response Data:', responseText);
    
    if (response.status === 200) {
      console.log('✅ API Working with exact form data!');
    } else {
      console.log('❌ API Error Details:');
      console.log('Status:', response.status);
      console.log('Response:', responseText);
      
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error Message:', errorData.error);
        console.log('Error Details:', errorData.details);
      } catch (e) {
        console.log('Raw response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
};

console.log('\n🚀 Testing Exact Error...');
testExactError();

console.log('\n💡 If API Test Works but UI Fails:');
console.log('1. Browser cache issue - try hard refresh (Ctrl+F5)');
console.log('2. Development server needs restart');
console.log('3. Form might be using old cached version');
console.log('4. Check browser console for detailed error');

console.log('\n🔧 Troubleshooting Steps:');
console.log('□ Hard refresh browser (Ctrl+F5)');
console.log('□ Restart development server');
console.log('□ Clear browser cache');
console.log('□ Check server console logs');
console.log('□ Verify file changes were saved');
