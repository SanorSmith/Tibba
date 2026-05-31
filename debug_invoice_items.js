// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function debugInvoiceItems() {
  console.log('🔍 DEBUGGING INVOICE ITEMS ISSUE');
  console.log('=====================================');

  const invoiceId = '8fbd36ee-ad58-4830-9f9c-f1133571a14b';

  try {
    // 1. Check what the API returns
    console.log('\n1. Testing API response format...');
    
    const invoiceResult = await pool.query(`
      SELECT * FROM invoices WHERE id = $1
    `, [invoiceId]);

    if (invoiceResult.rows.length === 0) {
      console.log('❌ Invoice not found');
      return;
    }

    const invoice = invoiceResult.rows[0];
    console.log('✅ Invoice found:', {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      total_amount: invoice.total_amount
    });

    // 2. Get invoice items
    console.log('\n2. Getting invoice items...');
    const itemsResult = await pool.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY createdat
    `, [invoiceId]);

    console.log(`Found ${itemsResult.rows.length} items:`);
    itemsResult.rows.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        id: item.id,
        service_id: item.service_id,
        service_name: item.service_name,
        service_name_ar: item.service_name_ar,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      });
    });

    // 3. Test the API response format
    console.log('\n3. Testing API response format...');
    const apiResponse = {
      success: true,
      data: {
        ...invoice,
        items: itemsResult.rows || []
      }
    };

    console.log('API Response structure:');
    console.log('- success:', apiResponse.success);
    console.log('- data.id:', apiResponse.data.id);
    console.log('- data.invoice_number:', apiResponse.data.invoice_number);
    console.log('- data.items length:', apiResponse.data.items.length);
    
    if (apiResponse.data.items.length > 0) {
      console.log('- data.items[0] keys:', Object.keys(apiResponse.data.items[0]));
      console.log('- data.items[0]:', apiResponse.data.items[0]);
    }

    // 4. Check what frontend expects
    console.log('\n4. Frontend expectation analysis...');
    console.log('Frontend expects items with fields:');
    console.log('- item_name_ar or item_name');
    console.log('- item_code');
    console.log('- quantity');
    console.log('- unit_price');
    console.log('- subtotal');

    console.log('\nAPI provides items with fields:');
    if (itemsResult.rows.length > 0) {
      console.log('- service_name, service_name_ar (not item_name, item_name_ar)');
      console.log('- service_id (not item_code)');
      console.log('- quantity');
      console.log('- unit_price');
      console.log('- total_price (not subtotal)');
    }

    // 5. Test mapping
    console.log('\n5. Testing field mapping...');
    if (itemsResult.rows.length > 0) {
      const originalItem = itemsResult.rows[0];
      const mappedItem = {
        id: originalItem.id,
        item_code: originalItem.service_id,
        item_name: originalItem.service_name,
        item_name_ar: originalItem.service_name_ar,
        quantity: originalItem.quantity,
        unit_price: originalItem.unit_price,
        subtotal: originalItem.total_price
      };

      console.log('Original item:', originalItem);
      console.log('Mapped item:', mappedItem);
      console.log('Has item_name_ar?', !!mappedItem.item_name_ar);
      console.log('Has item_name?', !!mappedItem.item_name);
      console.log('Has item_code?', !!mappedItem.item_code);
    }

    // 6. Check if there are any invoices without items
    console.log('\n6. Checking for invoices without items...');
    const emptyItemsResult = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, COUNT(ii.id) as item_count
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      GROUP BY i.id, i.invoice_number, i.total_amount
      HAVING COUNT(ii.id) = 0
      LIMIT 5
    `);

    console.log(`Found ${emptyItemsResult.rows.length} invoices without items:`);
    emptyItemsResult.rows.forEach((inv, index) => {
      console.log(`  ${index + 1}. ${inv.invoice_number} - Amount: ${inv.total_amount} - Items: ${inv.item_count}`);
    });

    // 7. Check specific invoice that might be showing the issue
    console.log('\n7. Looking for invoice with 1,000 IQD amount...');
    const thousandInvoiceResult = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, COUNT(ii.id) as item_count
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.total_amount = '1000.00'
      GROUP BY i.id, i.invoice_number, i.total_amount
    `);

    console.log(`Found ${thousandInvoiceResult.rows.length} invoices with 1,000 IQD:`);
    thousandInvoiceResult.rows.forEach((inv, index) => {
      console.log(`  ${index + 1}. ID: ${inv.id} - ${inv.invoice_number} - Items: ${inv.item_count}`);
      
      if (inv.item_count == 0) {
        console.log(`    ❌ This invoice has no items but shows total amount!`);
      }
    });

  } catch (error) {
    console.error('❌ DEBUG ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugInvoiceItems().catch(console.error);
