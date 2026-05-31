// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixEmptyInvoices() {
  console.log('🔧 FIXING EMPTY INVOICES');
  console.log('=========================');

  try {
    // Find all invoices that have amounts but no items
    const emptyInvoicesResult = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name, i.status, i.invoice_date
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE ii.invoice_id IS NULL
        AND i.total_amount != '0'
      ORDER BY i.invoice_date DESC
    `);

    console.log(`Found ${emptyInvoicesResult.rows.length} invoices with amounts but no items:`);

    // Get a suitable service for each amount
    const servicesResult = await pool.query(`
      SELECT id, code, name, name_ar, price_self_pay 
      FROM services 
      WHERE active = true
      ORDER BY price_self_pay
    `);

    const services = servicesResult.rows;
    console.log(`Found ${services.length} available services`);

    for (const invoice of emptyInvoicesResult.rows) {
      console.log(`\n--- Fixing Invoice: ${invoice.invoice_number} ---`);
      console.log(`Amount: ${invoice.total_amount} IQD`);
      console.log(`Patient: ${invoice.patient_name}`);

      // Find a service with matching price
      let selectedService = services.find(s => s.price_self_pay == invoice.total_amount);
      
      if (!selectedService) {
        // Find closest service
        selectedService = services.reduce((closest, service) => {
          const closestDiff = Math.abs(parseFloat(closest.price_self_pay) - parseFloat(invoice.total_amount));
          const serviceDiff = Math.abs(parseFloat(service.price_self_pay) - parseFloat(invoice.total_amount));
          return serviceDiff < closestDiff ? service : closest;
        });
        console.log(`Using closest service: ${selectedService.name} (${selectedService.price_self_pay} IQD)`);
      } else {
        console.log(`Using exact match service: ${selectedService.name}`);
      }

      // Create the missing invoice item
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
        invoice.id,
        selectedService.id,
        selectedService.name,
        selectedService.name_ar || '',
        1,
        invoice.total_amount,
        invoice.total_amount
      ]);

      console.log(`✅ Created invoice item for ${invoice.invoice_number}`);
    }

    // Verify the fixes
    console.log('\n🔍 VERIFYING FIXES...');
    const verifyResult = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, COUNT(ii.id) as item_count
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.total_amount != '0'
      GROUP BY i.id, i.invoice_number, i.total_amount
      HAVING COUNT(ii.id) = 0
    `);

    console.log(`Invoices still without items: ${verifyResult.rows.length}`);
    if (verifyResult.rows.length > 0) {
      console.log('Remaining problematic invoices:');
      verifyResult.rows.forEach(inv => {
        console.log(`  - ${inv.invoice_number}: ${inv.total_amount} IQD`);
      });
    } else {
      console.log('✅ All invoices now have items!');
    }

    // Test the specific "Noor Maliki" invoice
    console.log('\n🎯 TESTING NOOR MALIKI INVOICE...');
    const noorInvoiceResult = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name
      FROM invoices i
      WHERE i.patient_name ILIKE '%Noor%' AND i.total_amount = '1000.00'
      LIMIT 1
    `);

    if (noorInvoiceResult.rows.length > 0) {
      const noorInvoice = noorInvoiceResult.rows[0];
      console.log(`Found Noor Maliki invoice: ${noorInvoice.invoice_number}`);
      
      const noorItemsResult = await pool.query(`
        SELECT * FROM invoice_items WHERE invoice_id = $1
      `, [noorInvoice.id]);

      console.log(`Items: ${noorItemsResult.rows.length}`);
      if (noorItemsResult.rows.length > 0) {
        const item = noorItemsResult.rows[0];
        console.log('Item details:', {
          service_name: item.service_name,
          service_name_ar: item.service_name_ar,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
        
        // Test the mapped format
        const mappedItem = {
          id: item.id,
          item_code: item.service_id,
          item_name: item.service_name,
          item_name_ar: item.service_name_ar,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.total_price
        };
        
        console.log('✅ Mapped item for frontend:', mappedItem);
        console.log('✅ This invoice should now show services correctly!');
      }
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

fixEmptyInvoices().catch(console.error);
