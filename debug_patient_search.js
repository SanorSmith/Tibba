console.log('🔍 Debugging Patient Search Issue...');
console.log('='.repeat(50));

console.log('\n❌ Issue:');
console.log('• Search input shows "noo" but no records filtered');
console.log('• Search functionality not working');

console.log('\n🔍 Possible Causes:');
console.log('1. No patients loaded from database');
console.log('2. Search logic has issues');
console.log('3. Patient data structure mismatch');
console.log('4. Search state not updating');

const testPatientSearch = async () => {
  try {
    console.log('\n📡 Testing GET /api/tibbna-openehr-patients...');
    
    const response = await fetch('http://localhost:3000/api/tibbna-openehr-patients');
    const data = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Type:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('📊 Response Data:', data);
    
    if (response.ok) {
      const patientsArray = Array.isArray(data) ? data : (data.data || []);
      console.log('📋 Total Patients:', patientsArray.length);
      
      if (patientsArray.length > 0) {
        console.log('\n👤 First Patient Sample:');
        console.log('• ID:', patientsArray[0].id);
        console.log('• Patient Number:', patientsArray[0].patient_number);
        console.log('• Name (AR):', patientsArray[0].first_name_ar);
        console.log('• Name (EN):', patientsArray[0].first_name_en);
        console.log('• Phone:', patientsArray[0].phone);
        
        console.log('\n🔍 Testing Search Logic:');
        const searchTerm = 'noo';
        const filtered = patientsArray.filter(p => 
          p.full_name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.patient_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.full_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.phone?.includes(searchTerm)
        );
        
        console.log('• Search Term:', searchTerm);
        console.log('• Filtered Results:', filtered.length);
        console.log('• Should Match:', patientsArray.filter(p => 
          (p.first_name_ar || '').toLowerCase().includes('noo') ||
          (p.patient_number || '').toLowerCase().includes('noo') ||
          (p.first_name_en || '').toLowerCase().includes('noo') ||
          (p.phone || '').includes('noo')
        ).length);
      } else {
        console.log('⚠️ No patients found in database');
      }
    } else {
      console.log('❌ API Error:', data);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
};

console.log('\n🚀 Testing Patient Search...');
testPatientSearch();

console.log('\n💡 Debug Checklist:');
console.log('□ Check if patients exist in database');
console.log('□ Verify API returns patient data');
console.log('□ Check search field mapping');
console.log('□ Test search logic manually');
console.log('□ Check React state updates');

console.log('\n🔧 Expected Results:');
console.log('• API should return array of patients');
console.log('• Search should filter by name, patient number, or phone');
console.log('• Results should update in UI');
