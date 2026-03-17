console.log('🔍 Checking Database for Insurance Fields...');
console.log('='.repeat(50));

// Since we can't connect directly to the database due to SSL issues,
// let's check what the API is actually returning and see if there are
// any insurance-related fields we might be missing

console.log('\n📋 Checking API Response Structure...');

// Let's test the API to see what fields are actually returned
const testAPI = async () => {
  try {
    console.log('🌐 Making API call to /api/tibbna-openehr-patients...');
    
    const response = await fetch('http://localhost:3000/api/tibbna-openehr-patients?limit=1');
    
    if (!response.ok) {
      console.log('❌ API call failed:', response.status, response.statusText);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received');
    
    // Extract the first patient to see all available fields
    const patients = Array.isArray(data) ? data : (data.data || []);
    
    if (patients.length === 0) {
      console.log('❌ No patients found in database');
      return;
    }
    
    const firstPatient = patients[0];
    
    console.log('\n📊 All fields returned by API:');
    console.log('='.repeat(40));
    
    Object.keys(firstPatient).forEach(key => {
      const value = firstPatient[key];
      const type = typeof value;
      const displayValue = value === null ? 'NULL' : (typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value);
      console.log(`• ${key}: ${displayValue} (${type})`);
    });
    
    console.log('\n🔍 Looking for insurance-related fields...');
    const insuranceFields = Object.keys(firstPatient).filter(key => 
      key.toLowerCase().includes('insurance') || 
      key.toLowerCase().includes('appointment')
    );
    
    if (insuranceFields.length === 0) {
      console.log('❌ No insurance fields found in API response');
    } else {
      console.log('✅ Insurance-related fields found:');
      insuranceFields.forEach(field => {
        console.log(`• ${field}: ${firstPatient[field]}`);
      });
    }
    
    console.log('\n🔍 Checking for any fields that might contain insurance data...');
    const possibleInsuranceFields = Object.keys(firstPatient).filter(key => 
      key.toLowerCase().includes('insur') ||
      key.toLowerCase().includes('appoint') ||
      key.toLowerCase().includes('coverage') ||
      key.toLowerCase().includes('plan') ||
      key.toLowerCase().includes('policy')
    );
    
    if (possibleInsuranceFields.length > 0) {
      console.log('✅ Possible insurance fields:');
      possibleInsuranceFields.forEach(field => {
        console.log(`• ${field}: ${firstPatient[field]}`);
      });
    } else {
      console.log('❌ No possible insurance fields found');
    }
    
  } catch (error) {
    console.log('❌ Error testing API:', error.message);
  }
};

// Run the test
testAPI();

console.log('\n💡 Next Steps:');
console.log('1. Check the actual API response above');
console.log('2. Look for any insurance-related field names');
console.log('3. If found, update the frontend to use correct field names');
console.log('4. If not found, the fields might be in a separate table');
