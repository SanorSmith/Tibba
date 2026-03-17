console.log('🧪 Testing Recruitment API Endpoints...');
console.log('='.repeat(50));

console.log('\n📡 Test these URLs in your browser:');
console.log('1. http://localhost:3000/api/hr/recruitment');
console.log('2. http://localhost:3000/api/hr/recruitment?type=vacancies');
console.log('3. http://localhost:3000/api/hr/recruitment?type=candidates');

console.log('\n🔍 What to check:');
console.log('- Do the endpoints return JSON data?');
console.log('- Are there any error messages?');
console.log('- Do the vacancy IDs match the ones in the database?');

console.log('\n📊 Expected API Response Format:');
console.log('{"success": true, "data": [...]}');

console.log('\n🎯 Debug Steps:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Network tab');
console.log('3. Navigate to vacancy detail page');
console.log('4. Check if API requests are made');
console.log('5. Check response status and data');

console.log('\n🔧 If API fails:');
console.log('- Check server console for errors');
console.log('- Verify database connection');
console.log('- Check API route syntax');

console.log('\n📱 Test Vacancy Detail URLs:');
console.log('1. http://localhost:3000/hr/recruitment/vacancies/d4781355-1013-4f6b-bc14-dac93d345289');
console.log('2. http://localhost:3000/hr/recruitment/vacancies/e6d7dbb4-a4c7-40bf-854a-d50fde16a240');
console.log('3. http://localhost:3000/hr/recruitment/vacancies/f72ca09a-ff4c-4c25-8f72-3e7ad81780ea');

console.log('\n🚀 Ready to Test!');
console.log('Check the API endpoints first, then try the vacancy detail pages!');
