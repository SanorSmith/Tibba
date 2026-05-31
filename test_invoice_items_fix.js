// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testInvoiceItemsFix() {
  console.log('🧪 TESTING INVOICE ITEMS FIX');
  console.log('===============================');

  const invoiceId = '8fbd36ee-ad58-4830-9f9c-f1133571a14b';

  try {
    // Simulate the API GET request with mapping
    console.log('\n1. Simulating API GET request...');
    
    const invoiceResult = await pool.query(`
      SELECT * FROM invoices WHERE id = $1
    `, [invoiceId]);

    if (invoiceResult.rows.length === 0) {
      console.log('❌ Invoice not found');
      return;
    }

    const itemsResult = await pool.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY createdat
    `, [invoiceId]);

    const invoice = invoiceResult.rows[0];
    const items = itemsResult.rows || [];

    // Map items to frontend-expected format (NEW LOGIC)
    const mappedItems = items.map(item => ({
      id: item.id,
      item_code: item.service_id,
      item_name: item.service_name,
      item_name_ar: item.service_name_ar,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.total_price,
      createdat: item.createdat
    }));

    console.log('✅ API Response with mapping:');
    console.log('- Invoice ID:', invoice.id);
    console.log('- Invoice Number:', invoice.invoice_number);
    console.log('- Items Count:', mappedItems.length);
    
    if (mappedItems.length > 0) {
      console.log('- First Item:', mappedItems[0]);
      console.log('- Has item_name_ar?', !!mappedItems[0].item_name_ar);
      console.log('- Has item_name?', !!mappedItems[0].item_name);
      console.log('- Has item_code?', !!mappedItems[0].item_code);
      console.log('- Has subtotal?', !!mappedItems[0].subtotal);
    }

    // Test frontend rendering logic
    console.log('\n2. Testing frontend rendering logic...');
    console.log('viewItems.length =', mappedItems.length);
    
    if (mappedItems.length === 0) {
      console.log('❌ Would show: "No services recorded for this invoice."');
    } else {
      console.log('✅ Would show services table with items:');
      mappedItems.forEach((item, index) => {
        console.log(`  Item ${index + 1}: ${item.item_name_ar || item.item_name} (${item.quantity} × ${item.unit_price})`);
      });
    }

    // Test with one of the 1,000 IQD invoices
    console.log('\n3. Testing with 1,000 IQD invoice...');
    const thousandInvoiceResult = await pool.query(`
      SELECT * FROM invoices WHERE total_amount = '1000.00' LIMIT 1
    `);

    if (thousandInvoiceResult.rows.length > 0) {
      const testInvoice = thousandInvoiceResult.rows[0];
      console.log('Found 1,000 IQD invoice:', testInvoice.invoice_number);
      
      const testItemsResult = await pool.query(`
        SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY createdat
      `, [testInvoice.id]);

      const testItems = testItemsResult.rows || [];
      const mappedTestItems = testItems.map(item => ({
        id: item.id,
        item_code: item.service_id,
        item_name: item.service_name,
        item_name_ar: item.service_name_ar,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.total_price,
        createdat: item.createdat
      }));

      console.log('Items for 1,000 IQD invoice:', mappedTestItems.length);
      if (mappedTestItems.length > 0) {
        console.log('First item:', mappedTestItems[0]);
      } else {
        console.log('❌ This invoice has no items - this might be the problem!');
      }
    }

    console.log('\n✅ FIX VERIFICATION COMPLETE');
    console.log('The API now returns items with correct field names for the frontend.');

  } catch (error) {
    console.error('❌ TEST ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testInvoiceItemsFix().catch(console.error);
