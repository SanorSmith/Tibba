// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function debugFrontendIssue() {
  console.log('🔍 DEBUGGING FRONTEND ISSUE');
  console.log('=============================');

  try {
    // Find all Noor Maliki invoices with 1,000 IQD
    console.log('\n1. Finding all Noor Maliki invoices with 1,000 IQD...');
    const invoices = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name, i.patient_name_ar, i.status
      FROM invoices i
      WHERE (i.patient_name ILIKE '%Noor%' OR i.patient_name_ar ILIKE '%Noor%' OR i.patient_name ILIKE '%Maliki%' OR i.patient_name_ar ILIKE '%Maliki%')
        AND i.total_amount = '1000.00'
      ORDER BY i.invoice_date DESC
    `);

    console.log(`Found ${invoices.rows.length} matching invoices:`);
    
    for (const invoice of invoices.rows) {
      console.log(`\n--- Invoice: ${invoice.invoice_number} ---`);
      console.log(`ID: ${invoice.id}`);
      console.log(`Patient: ${invoice.patient_name} / ${invoice.patient_name_ar}`);
      console.log(`Amount: ${invoice.total_amount} IQD`);
      console.log(`Status: ${invoice.status}`);
      
      // Check items for this specific invoice
      const items = await pool.query(`
        SELECT * FROM invoice_items WHERE invoice_id = $1
      `, [invoice.id]);

      console.log(`Items in database: ${items.rows.length}`);
      
      if (items.rows.length > 0) {
        const item = items.rows[0];
        console.log('Item details:');
        console.log(`  Service: ${item.service_name}`);
        console.log(`  Code: ${item.service_id}`);
        console.log(`  Qty: ${item.quantity} × ${item.unit_price} = ${item.total_price}`);
        
        // Show what API should return
        const mappedItem = {
          id: item.id,
          item_code: item.service_id,
          item_name: item.service_name,
          item_name_ar: item.service_name_ar,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.total_price
        };
        
        console.log('✅ API should return this mapped item:', mappedItem);
      } else {
        console.log('❌ No items found - this would cause the issue!');
      }
    }

    // Check if there might be multiple Noor Maliki invoices and the wrong one is being shown
    console.log('\n2. Checking for all Noor Maliki invoices (any amount)...');
    const allNoorInvoices = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name, COUNT(ii.id) as item_count,
             STRING_AGG(ii.service_name, ', ') as services
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE (i.patient_name ILIKE '%Noor%' OR i.patient_name_ar ILIKE '%Noor%' OR i.patient_name ILIKE '%Maliki%' OR i.patient_name_ar ILIKE '%Maliki%')
      GROUP BY i.id, i.invoice_number, i.total_amount, i.patient_name
      ORDER BY i.invoice_date DESC
    `);

    console.log(`All Noor Maliki invoices (${allNoorInvoices.rows.length}):`);
    allNoorInvoices.rows.forEach((inv, index) => {
      console.log(`${index + 1}. ${inv.invoice_number} - ${inv.total_amount} IQD - Items: ${inv.item_count}`);
      if (inv.services) {
        console.log(`   Services: ${inv.services}`);
      }
    });

    // Check the most recent invoice that might be shown in UI
    console.log('\n3. Checking the most recent invoice that might be displayed...');
    const recentInvoice = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name, i.invoice_date
      FROM invoices i
      WHERE (i.patient_name ILIKE '%Noor%' OR i.patient_name ILIKE '%Maliki%' OR i.patient_name_ar ILIKE '%Noor%' OR i.patient_name_ar ILIKE '%Maliki%')
      ORDER BY i.invoice_date DESC
      LIMIT 1
    `);

    if (recentInvoice.rows.length > 0) {
      const recent = recentInvoice.rows[0];
      console.log(`Most recent: ${recent.invoice_number} - ${recent.total_amount} IQD - ${recent.patient_name}`);
      console.log(`Date: ${recent.invoice_date}`);
      
      // Check if this one has items
      const recentItems = await pool.query(`
        SELECT COUNT(*) as count FROM invoice_items WHERE invoice_id = $1
      `, [recent.id]);
      
      console.log(`Items: ${recentItems.rows[0].count}`);
      
      if (recentItems.rows[0].count === 0) {
        console.log('❌ This might be the invoice shown in UI - it has no items!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

debugFrontendIssue();
