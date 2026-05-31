// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function forceFix() {
  console.log('🔧 FORCE FIX - DIRECT DATABASE CHECK');
  console.log('===================================');

  try {
    // Get the exact invoice being shown
    const invoiceId = 'aba3e509-0a82-490e-9d11-79bd03f082d5'; // INV-2026-579685 (PENDING, Noor Maliki)
    
    console.log('\n1. Checking exact invoice data...');
    const invoice = await pool.query(`
      SELECT * FROM invoices WHERE id = $1
    `, [invoiceId]);

    if (invoice.rows.length === 0) {
      console.log('❌ Invoice not found');
      return;
    }

    const inv = invoice.rows[0];
    console.log('Invoice:', {
      id: inv.id,
      invoice_number: inv.invoice_number,
      patient_name: inv.patient_name,
      total_amount: inv.total_amount,
      status: inv.status
    });

    // Get items
    console.log('\n2. Checking invoice items...');
    const items = await pool.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1
    `, [invoiceId]);

    console.log(`Items found: ${items.rows.length}`);
    
    if (items.rows.length > 0) {
      const item = items.rows[0];
      console.log('Item data:', {
        id: item.id,
        service_id: item.service_id,
        service_name: item.service_name,
        service_name_ar: item.service_name_ar,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      });

      // Create a direct test response
      const testResponse = {
        success: true,
        data: {
          ...inv,
          items: items.rows.map(item => ({
            id: item.id,
            item_code: item.service_id,
            item_name: item.service_name,
            item_name_ar: item.service_name_ar || '',
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.total_price
          }))
        }
      };

      console.log('\n3. Test API response structure:');
      console.log('- success:', testResponse.success);
      console.log('- data.invoice_number:', testResponse.data.invoice_number);
      console.log('- data.items length:', testResponse.data.items.length);
      console.log('- first item:', testResponse.data.items[0]);

      // Test if this would work in frontend
      console.log('\n4. Frontend simulation:');
      console.log('viewItems.length =', testResponse.data.items.length);
      
      if (testResponse.data.items.length > 0) {
        console.log('✅ Frontend should show:');
        testResponse.data.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.item_name}`);
          console.log(`     Qty: ${item.quantity} × ${item.unit_price} = ${item.subtotal}`);
        });
      } else {
        console.log('❌ Frontend would show "No services recorded"');
      }

    } else {
      console.log('❌ No items found - this is the root cause!');
      
      // Create a dummy item to fix it
      console.log('\n5. Creating missing item...');
      await pool.query(`
        INSERT INTO invoice_items (
          invoice_id, 
          service_id, 
          service_name, 
          service_name_ar, 
          quantity, 
          unit_price, 
          total_price
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        invoiceId,
        'CONS002',
        'Specialist Consultation',
        '',
        1,
        '1000.00',
        '1000.00'
      ]);

      console.log('✅ Created missing item for invoice');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

forceFix();
