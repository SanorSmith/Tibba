// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testFixDirectly() {
  console.log('🧪 TESTING FIX DIRECTLY IN DATABASE');
  console.log('===================================');

  const invoiceId = '8fbd36ee-ad58-4830-9f9c-f1133571a14b';

  // Test data that matches what the frontend sends
  const frontendPayload = {
    invoice_number: 'INV-2024-00011',
    invoice_date: '2024-03-23',
    patient_id: '72c0c6c1-8255-42c9-852b-9dfe090345d2',
    patient_name: 'Test Patient',
    patient_name_ar: 'مريض اختبار',
    subtotal: 3000000,
    discount_percentage: 0,
    discount_amount: 0,
    total_amount: 3000000,
    insurance_company_id: null,
    insurance_coverage_amount: 0,
    insurance_coverage_percentage: 0,
    patient_responsibility: 3000000,
    amount_paid: 0,
    balance_due: 3000000,
    status: 'PENDING',
    payment_method: null,
    payment_date: null,
    notes: 'Test update from frontend simulation',
    items: [
      {
        item_type: 'SERVICE',
        item_code: 'srv-002',
        item_name: 'عملية الزائدة الدودية',
        item_name_ar: 'عملية الزائدة الدودية',
        description: 'Surgery',
        quantity: 1,
        unit_price: 3000000,
        subtotal: 3000000,
        insurance_covered: false,
        insurance_coverage_percentage: 0,
        insurance_amount: 0,
        patient_amount: 3000000,
        provider_id: null,
        provider_name: null,
        service_fee: 0,
      }
    ]
  };

  try {
    console.log('Testing with frontend-style payload...');
    console.log('Items field mapping test:');
    
    // Test the field mapping logic
    const testItem = frontendPayload.items[0];
    console.log('Original item fields:', Object.keys(testItem));
    
    const mappedItem = {
      service_id: testItem.service_id || testItem.item_code || '',
      service_name: testItem.service_name || testItem.item_name || '',
      service_name_ar: testItem.service_name_ar || testItem.item_name_ar || '',
      quantity: testItem.quantity || 1,
      unit_price: testItem.unit_price || 0,
      total_price: testItem.subtotal || testItem.total_price || (testItem.quantity || 1) * (testItem.unit_price || 0)
    };
    
    console.log('Mapped item fields:', Object.keys(mappedItem));
    console.log('Mapped item values:', mappedItem);

    // Now test the actual database operations
    await pool.query('BEGIN');

    try {
      // Test the update with the mapped fields
      const updateFields = ['notes = $1', 'updatedat = NOW()'];
      const updateValues = [frontendPayload.notes];
      updateValues.push(invoiceId);

      const invoiceResult = await pool.query(`
        UPDATE invoices SET
          ${updateFields.join(', ')}
        WHERE id = $2
        RETURNING *
      `, updateValues);

      console.log('✅ Invoice updated successfully');

      // Test the item insert with mapped fields
      await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
      console.log('✅ Deleted existing items');

      // Insert with mapped fields
      await pool.query(`
        INSERT INTO invoice_items (
          invoice_id,
          service_id,
          service_name,
          service_name_ar,
          quantity,
          unit_price,
          total_price
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
      `, [
        invoiceId,
        mappedItem.service_id,
        mappedItem.service_name,
        mappedItem.service_name_ar,
        mappedItem.quantity,
        mappedItem.unit_price,
        mappedItem.total_price
      ]);

      console.log('✅ Item inserted with mapped fields');

      await pool.query('COMMIT');
      console.log('✅ Transaction committed');

      // Verify the results
      const verifyItems = await pool.query(`
        SELECT * FROM invoice_items WHERE invoice_id = $1
      `, [invoiceId]);

      console.log('📊 VERIFICATION:');
      console.log('Items count:', verifyItems.rows.length);
      verifyItems.rows.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`, {
          service_id: item.service_id,
          service_name: item.service_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      });

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testFixDirectly().catch(console.error);
