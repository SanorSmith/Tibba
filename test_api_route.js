// Test if the API route exists and works
const reviewId = '0179e29e-cb91-4d90-a99a-81db3b4795c8';

console.log('🧪 Testing API Route...');
console.log(`URL: http://localhost:3000/api/hr/performance/reviews/${reviewId}`);

// This would normally be tested with curl or fetch in a browser
// But since we're in Node.js, let's create a simple test
console.log('\n📝 Manual Test Instructions:');
console.log('1. Open browser');
console.log(`2. Go to: http://localhost:3000/api/hr/performance/reviews/${reviewId}`);
console.log('3. Check if it returns JSON or 404');

console.log('\n🔍 Expected Response:');
console.log(`{
  "success": true,
  "data": {
    "id": "${reviewId}",
    "employee_name": "user test",
    "employee_role": "Nurse",
    "status": "IN_PROGRESS",
    ...
  }
}`);

console.log('\n❌ If 404, the API route file might not be in the right location');
console.log('📁 Expected location: src/app/api/hr/performance/reviews/[id]/route.ts');
