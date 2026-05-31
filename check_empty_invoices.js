// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkEmptyInvoices() {
  console.log('🔍 CHECKING INVOICES WITHOUT ITEMS');
  console.log('===================================');

  try {
    // Find all invoices that have amounts but no items
    console.log('\n1. Finding invoices with amounts but no items...');
    
    const emptyInvoicesResult = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name, i.status, i.invoice_date
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE ii.invoice_id IS NULL
        AND i.total_amount != '0'
      ORDER BY i.invoice_date DESC
      LIMIT 10
    `);

    console.log(`Found ${emptyInvoicesResult.rows.length} invoices with amounts but no items:`);
    
    emptyInvoicesResult.rows.forEach((inv, index) => {
      console.log(`\n${index + 1}. Invoice: ${inv.invoice_number}`);
      console.log(`   ID: ${inv.id}`);
      console.log(`   Patient: ${inv.patient_name || 'Unknown'}`);
      console.log(`   Amount: ${inv.total_amount} IQD`);
      console.log(`   Status: ${inv.status}`);
      console.log(`   Date: ${inv.invoice_date}`);
      console.log(`   ❌ PROBLEM: No items but has amount!`);
    });

    // Check if any of these might be the one showing in the UI
    console.log('\n2. Checking for "Noor Maliki" patient...');
    const noorInvoicesResult = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name, i.patient_name_ar, COUNT(ii.id) as item_count
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.patient_name ILIKE '%Noor%' OR i.patient_name_ar ILIKE '%Noor%' OR i.patient_name ILIKE '%Maliki%' OR i.patient_name_ar ILIKE '%Maliki%'
      GROUP BY i.id, i.invoice_number, i.total_amount, i.patient_name, i.patient_name_ar
      ORDER BY i.invoice_date DESC
    `);

    console.log(`Found ${noorInvoicesResult.rows.length} invoices for "Noor Maliki":`);
    
    noorInvoicesResult.rows.forEach((inv, index) => {
      console.log(`\n${index + 1}. Invoice: ${inv.invoice_number}`);
      console.log(`   ID: ${inv.id}`);
      console.log(`   Patient: ${inv.patient_name || inv.patient_name_ar}`);
      console.log(`   Amount: ${inv.total_amount} IQD`);
      console.log(`   Items: ${inv.item_count}`);
      
      if (inv.item_count === 0) {
        console.log(`   ❌ This is the problematic invoice!`);
      } else {
        console.log(`   ✅ This invoice has items`);
      }
    });

    // Create items for empty invoices if needed
    if (emptyInvoicesResult.rows.length > 0) {
      console.log('\n3. Suggestion: Create missing items for empty invoices...');
      
      // Get a sample service to use
      const serviceResult = await pool.query(`
        SELECT id, service_name, service_name_ar, unit_price 
        FROM services 
        WHERE unit_price = '1000.00'
        LIMIT 1
      `);

      if (serviceResult.rows.length > 0) {
        const sampleService = serviceResult.rows[0];
        console.log(`Found sample service: ${sampleService.service_name}`);
        
        console.log('\nTo fix empty invoices, you can run:');
        emptyInvoicesResult.rows.forEach((inv, index) => {
          console.log(`-- Fix invoice ${inv.invoice_number} (${inv.total_amount} IQD)`);
          console.log(`INSERT INTO invoice_items (invoice_id, service_id, service_name, service_name_ar, quantity, unit_price, total_price)`);
          console.log(`VALUES ('${inv.id}', '${sampleService.id}', '${sampleService.service_name}', '${sampleService.service_name_ar || ''}', 1, ${inv.total_amount}, ${inv.total_amount});`);
        });
      }
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkEmptyInvoices().catch(console.error);
