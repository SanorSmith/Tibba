const http = require('http');

function debugSpecificItems() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/financial-dashboard?period=month',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log('=== DEBUGGING SPECIFIC ITEMS ===');
        
        if (result.success && result.data?.revenue?.breakdown) {
          const breakdown = result.data.revenue.breakdown;
          
          // Find the problematic items
          const problemItems = breakdown.filter(item => 
            ['PAID_INVOICES', 'INSURANCE_PAYMENTS', 'PATIENT_PAYMENTS'].includes(item.category)
          );
          
          console.log('🔍 Problematic Items:');
          problemItems.forEach((item, i) => {
            console.log(`${i + 1}. Category: "${item.category}"`);
            console.log(`   category_label: "${item.category_label || 'MISSING'}"`);
            console.log(`   display_name: "${item.display_name || 'MISSING'}"`);
            console.log(`   Revenue: ${item.revenue}`);
            console.log('');
          });
          
          // Also check a working item for comparison
          const workingItem = breakdown.find(item => item.category === 'Surgery');
          if (workingItem) {
            console.log('✅ Working Item (for comparison):');
            console.log(`   Category: "${workingItem.category}"`);
            console.log(`   category_label: "${workingItem.category_label || 'MISSING'}"`);
            console.log(`   display_name: "${workingItem.display_name || 'MISSING'}"`);
            console.log(`   Revenue: ${workingItem.revenue}`);
          }
          
          console.log('\n🎯 DIAGNOSIS:');
          if (problemItems.every(item => !item.category_label && !item.display_name)) {
            console.log('❌ API is NOT returning label mapping for invoice categories');
            console.log('🔧 Need to check why label mapping is not applied to these items');
          } else {
            console.log('✅ API is returning labels, frontend issue');
          }
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
        console.log('Raw data preview:', data.substring(0, 500));
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request Error:', error.message);
  });

  req.end();
}

debugSpecificItems();
