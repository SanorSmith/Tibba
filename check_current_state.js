// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function checkCurrentState() {
  console.log('🔍 CHECKING CURRENT STATE');
  console.log('==========================');

  try {
    // Check all Noor Maliki invoices
    console.log('\n1. All Noor Maliki invoices:');
    const noorInvoices = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name, COUNT(ii.id) as item_count
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE i.patient_name ILIKE '%Noor%' OR i.patient_name ILIKE '%Maliki%'
      GROUP BY i.id, i.invoice_number, i.total_amount, i.patient_name
      ORDER BY i.total_amount DESC
    `);

    noorInvoices.rows.forEach((inv, index) => {
      console.log(`${index + 1}. ${inv.invoice_number} - ${inv.total_amount} IQD - Items: ${inv.item_count}`);
    });

    // Check the specific invoice that was shown in the UI
    console.log('\n2. Checking the 1,000 IQD invoice that was showing the issue...');
    const thousandInvoice = await pool.query(`
      SELECT i.id, i.invoice_number, i.total_amount, i.patient_name
      FROM invoices i
      WHERE i.total_amount = '1000.00' 
        AND (i.patient_name ILIKE '%Noor%' OR i.patient_name ILIKE '%Maliki%')
      LIMIT 1
    `);

    if (thousandInvoice.rows.length > 0) {
      const invoice = thousandInvoice.rows[0];
      console.log(`Found: ${invoice.invoice_number} - ${invoice.patient_name}`);
      
      // Get items for this invoice
      const items = await pool.query(`
        SELECT * FROM invoice_items WHERE invoice_id = $1
      `, [invoice.id]);

      console.log(`Items in database: ${items.rows.length}`);
      
      if (items.rows.length > 0) {
        const item = items.rows[0];
        console.log('Raw item from database:', {
          service_id: item.service_id,
          service_name: item.service_name,
          service_name_ar: item.service_name_ar,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });

        // Show what the API should return after mapping
        const mappedItem = {
          id: item.id,
          item_code: item.service_id,
          item_name: item.service_name,
          item_name_ar: item.service_name_ar,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.total_price
        };

        console.log('Mapped item (what API should return):', mappedItem);
        console.log('✅ This should display in frontend');
      } else {
        console.log('❌ No items found - this is the problem!');
      }
    }

    // Check if there are any invoices that truly have no items
    console.log('\n3. Checking for invoices with no items...');
    const emptyInvoices = await pool.query(`
      SELECT COUNT(*) as count
      FROM invoices i
      LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
      WHERE ii.id IS NULL
        AND i.total_amount != '0'
    `);

    console.log(`Invoices with amounts but no items: ${emptyInvoices.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCurrentState();
