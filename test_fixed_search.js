console.log('🔧 Testing Fixed Patient Search...');
console.log('='.repeat(50));

console.log('\n✅ Fix Applied:');
console.log('• Fixed field mapping in loadPatients function');
console.log('• Now uses correct API field names');
console.log('• Search should work properly');

console.log('\n📊 Field Mapping Fixed:');
console.log('API Response → Frontend');
console.log('• firstNameAr → first_name_ar');
console.log('• lastNameAr → last_name_ar');
console.log('• firstNameEn → first_name_en');
console.log('• lastNameEn → last_name_en');
console.log('• patientNumber → patient_number');
console.log('• dateOfBirth → date_of_birth');
console.log('• nationalId → national_id');
console.log('• createdAt → created_at');

const testFixedSearch = async () => {
  try {
    console.log('\n📡 Testing GET /api/tibbna-openehr-patients...');
    
    const response = await fetch('http://localhost:3000/api/tibbna-openehr-patients');
    const data = await response.json();
    
    const rawPatients = Array.isArray(data) ? data : (data.data || []);
    console.log('📋 Total Patients:', rawPatients.length);
    
    if (rawPatients.length > 0) {
      // Simulate the fixed mapping
      const mappedPatients = rawPatients.map((p) => ({
        patient_id: p.patientid || p.id,
        patient_number: p.patientNumber || p.patientid || p.id,
        first_name_ar: p.firstNameAr || p.firstname || '',
        last_name_ar: p.lastNameAr || p.lastname || '',
        full_name_ar: `${p.firstNameAr || p.firstname || ''} ${p.lastNameAr || p.lastname || ''}`.trim(),
        first_name_en: p.firstNameEn || p.firstname || '',
        last_name_en: p.lastNameEn || p.lastname || '',
        full_name_en: `${p.firstNameEn || p.firstname || ''} ${p.lastNameEn || p.lastname || ''}`.trim(),
        phone: p.phone || '',
        date_of_birth: p.dateOfBirth || p.dateofbirth || '',
        gender: p.gender || 'MALE',
        national_id: p.nationalId || p.nationalid || '',
      }));
      
      console.log('\n🔍 Testing Search with "noo":');
      const searchTerm = 'noo';
      const filtered = mappedPatients.filter(p => 
        p.full_name_ar?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.patient_number?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.full_name_en?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.phone?.includes(searchTerm)
      );
      
      console.log('• Search Term:', searchTerm);
      console.log('• Filtered Results:', filtered.length);
      
      console.log('\n🔍 Testing Search with "Patient":');
      const searchTerm2 = 'Patient';
      const filtered2 = mappedPatients.filter(p => 
        p.full_name_ar?.toLowerCase().includes(searchTerm2.toLowerCase()) || 
        p.patient_number?.toLowerCase().includes(searchTerm2.toLowerCase()) || 
        p.full_name_en?.toLowerCase().includes(searchTerm2.toLowerCase()) || 
        p.phone?.includes(searchTerm2)
      );
      
      console.log('• Search Term:', searchTerm2);
      console.log('• Filtered Results:', filtered2.length);
      
      console.log('\n👤 Sample Patient Data:');
      console.log('• Name (AR):', mappedPatients[0].first_name_ar, mappedPatients[0].last_name_ar);
      console.log('• Name (EN):', mappedPatients[0].first_name_en, mappedPatients[0].last_name_en);
      console.log('• Patient Number:', mappedPatients[0].patient_number);
      console.log('• Phone:', mappedPatients[0].phone);
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
};

console.log('\n🚀 Testing Fixed Search...');
testFixedSearch();

console.log('\n💡 Expected Result:');
console.log('• Search should now work in the UI');
console.log('• Typing "Patient" should show all patients');
console.log('• Typing "noo" should show no results');
console.log('• Search by phone number should work');

console.log('\n🎯 Test the UI:');
console.log('1. Go to /reception/patients');
console.log('2. Type "Patient" in search box');
console.log('3. Should see filtered results');
console.log('4. Type "noo" in search box');
console.log('5. Should see no results');
