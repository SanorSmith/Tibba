console.log('🔍 Debugging Exact Column Count...');
console.log('='.repeat(50));

console.log('\n📋 INSERT Statement Analysis:');
console.log('Columns in INSERT:');
const insertColumns = [
  'candidate_number', 'first_name', 'last_name', 'email', 'phone', 'gender',
  'nationality', 'education', 'university', 'specialization', 'experience_years',
  'current_employer', 'expected_salary', 'source', 'referral_employee', 'status', 'vacancy_id', 'resume_url', 'notes'
];

console.log(`Total columns: ${insertColumns.length}`);
insertColumns.forEach((col, i) => {
  console.log(`  ${i+1}. ${col}`);
});

console.log('\n📋 VALUES Analysis:');
console.log('Values provided:');
const values = [
  'data.candidate_number', 'data.first_name', 'data.last_name', 'data.email', 'data.phone', 'data.gender',
  'data.nationality', 'data.education', 'data.university', 'data.specialization', 'data.experience_years',
  'data.current_employer', 'data.expected_salary', 'data.source', 'data.referral_employee', 'data.status', 'data.vacancy_id', 'data.resume_url', 'data.notes'
];

console.log(`Total values: ${values.length}`);
values.forEach((val, i) => {
  console.log(`  $${i+1}. ${val}`);
});

console.log('\n📋 Database Table Columns:');
console.log('From database query:');
const dbColumns = [
  'id', 'candidate_number', 'first_name', 'last_name', 'email', 'phone', 'gender',
  'nationality', 'education', 'university', 'specialization', 'experience_years',
  'current_employer', 'expected_salary', 'source', 'referral_employee', 'status', 'vacancy_id', 
  'rejection_reason', 'resume_url', 'notes', 'created_at', 'updated_at'
];

console.log(`Total DB columns: ${dbColumns.length}`);
dbColumns.forEach((col, i) => {
  console.log(`  ${i+1}. ${col}`);
});

console.log('\n🔍 Comparison:');
console.log(`INSERT columns: ${insertColumns.length}`);
console.log(`VALUES count: ${values.length}`);
console.log(`Database columns: ${dbColumns.length}`);

console.log('\n✅ Match Analysis:');
if (insertColumns.length === values.length) {
  console.log('✅ Column count matches value count');
} else {
  console.log('❌ Column count does not match value count');
}

console.log('\n💡 Possible Issues:');
console.log('1. Server needs restart to pick up API changes');
console.log('2. Data type mismatch (experience_years should be integer)');
console.log('3. Missing required field handling');
console.log('4. Database connection issue');

console.log('\n🔧 Quick Fix:');
console.log('1. Restart the Next.js development server');
console.log('2. Try the form again');
console.log('3. Check server console for detailed error');

console.log('\n🚀 Next Steps:');
console.log('The API code looks correct. The issue is likely:');
console.log('- Server cache (needs restart)');
console.log('- Data type conversion issue');
console.log('- Missing field handling');
