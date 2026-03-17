// Test API route directly
async function testAPI() {
  try {
    console.log('🧪 Testing API route directly...');
    
    // Test the main reviews list endpoint first
    const listResponse = await fetch('http://localhost:3000/api/hr/performance/reviews');
    const listData = await listResponse.json();
    
    console.log('✅ List API works:', listData.success, 'Count:', listData.data?.length || 0);
    
    // Test individual review endpoint
    const reviewId = '9c77870b-0706-410c-b888-ee01fe9b6032';
    console.log(`\n🔍 Testing individual review: ${reviewId}`);
    
    const reviewResponse = await fetch(`http://localhost:3000/api/hr/performance/reviews/${reviewId}`);
    console.log(`Status: ${reviewResponse.status}`);
    
    if (reviewResponse.ok) {
      const reviewData = await reviewResponse.json();
      console.log('✅ Individual review works:', reviewData.success);
      console.log('Employee:', reviewData.data?.employee_name);
    } else {
      console.log('❌ Individual review failed');
      const errorText = await reviewResponse.text();
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run in browser console or as a simple fetch test
console.log(`
📝 To test manually:
1. Open browser console
2. Paste this code:
fetch('/api/hr/performance/reviews').then(r => r.json()).then(console.log)
3. Then test:
fetch('/api/hr/performance/reviews/9c77870b-0706-410c-b888-ee01fe9b6032').then(r => r.json()).then(console.log)
`);
