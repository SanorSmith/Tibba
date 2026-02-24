const fetch = require('node-fetch');

async function testPatientsAPI() {
  try {
    console.log('🔍 TESTING PATIENTS API WITH NEW DATABASE NAME');
    console.log('============================================\n');

    const response = await fetch('http://localhost:3003/api/tibbna-openehr-patients');
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📋 Patients Count:', Array.isArray(data) ? data.length : 'Not an array');
    
    if (Array.isArray(data) && data.length > 0) {
      console.log('✅ SUCCESS: Patients API working with Non-Medical DB');
      console.log('👤 First Patient:', data[0].firstname || data[0].first_name_ar, 'Unknown');
    } else {
      console.log('⚠️  WARNING: No patients found or API error');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testPatientsAPI();
