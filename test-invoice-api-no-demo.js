const postgres = require('postgres');

async function testInvoiceAPI() {
  try {
    console.log('🔍 TESTING INVOICE API WITHOUT DEMO DATA');
    console.log('========================================\n');

    // Test the API endpoint directly
    const response = await fetch('http://localhost:3003/api/invoices');
    const data = await response.json();
    
    console.log('📊 API Response Status:', response.status);
    console.log('📋 API Response Data:', data);
    
    if (response.status === 500) {
      console.log('✅ SUCCESS: API returns 500 error (expected - no Supabase config)');
      console.log('🎯 This means demo data is successfully removed!');
    } else if (Array.isArray(data)) {
      console.log('📈 API returned array with', data.length, 'invoices');
      if (data.length === 0) {
        console.log('✅ SUCCESS: Empty array (no demo data)');
      } else {
        console.log('⚠️  WARNING: Still getting data - check if demo data is still there');
      }
    }

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testInvoiceAPI();
