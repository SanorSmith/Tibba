// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function testInvoicePut() {
  console.log('🧪 TESTING INVOICE PUT REQUEST');
  console.log('=====================================');

  const invoiceId = '8fbd36ee-ad58-4830-9f9c-f1133571a14b';

  // Test data that matches what the API expects
  const testData = {
    invoice_number: 'INV-2024-00011',
    invoice_date: '2024-03-23',
    patient_id: '72c0c6c1-8255-42c9-852b-9dfe090345d2',
    patient_name: 'Test Patient',
    patient_name_ar: 'مريض اختبار',
    subtotal: 3000000.00,
    discount_percentage: 0,
    discount_amount: 0,
    total_amount: 3000000.00,
    insurance_company_id: null,
    insurance_coverage_amount: 0,
    insurance_coverage_percentage: 0,
    patient_responsibility: 3000000.00,
    amount_paid: 0,
    balance_due: 3000000.00,
    status: 'PENDING',
    payment_method: null,
    payment_date: null,
    notes: 'Test update from debug script',
    items: [
      {
        service_id: 'srv-002',
        service_name: 'عملية الزائدة الدودية',
        service_name_ar: 'عملية الزائدة الدودية',
        quantity: 1,
        unit_price: 3000000.00,
        subtotal: 3000000.00
      }
    ]
  };

  try {
    console.log('Sending test data:', JSON.stringify(testData, null, 2));

    // Simulate the PUT request logic from the API
    const {
      invoice_number,
      invoice_date,
      patient_id,
      patient_name,
      patient_name_ar,
      subtotal,
      discount_percentage,
      discount_amount,
      total_amount,
      insurance_company_id,
      insurance_coverage_amount,
      insurance_coverage_percentage,
      patient_responsibility,
      amount_paid,
      balance_due,
      status,
      payment_method,
      payment_date,
      notes,
      items
    } = testData;

    console.log('\n🔄 Starting transaction...');
    await pool.query('BEGIN');

    try {
      // Build dynamic update query (same as API)
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      // Add fields dynamically if they exist in the body
      if (invoice_number !== undefined) {
        updateFields.push(`invoice_number = $${paramIndex}`);
        updateValues.push(invoice_number);
        paramIndex++;
      }
      if (invoice_date !== undefined) {
        updateFields.push(`invoice_date = $${paramIndex}`);
        updateValues.push(invoice_date);
        paramIndex++;
      }
      if (patient_id !== undefined) {
        updateFields.push(`patient_id = $${paramIndex}`);
        updateValues.push(patient_id);
        paramIndex++;
      }
      if (patient_name !== undefined) {
        updateFields.push(`patient_name = $${paramIndex}`);
        updateValues.push(patient_name);
        paramIndex++;
      }
      if (patient_name_ar !== undefined) {
        updateFields.push(`patient_name_ar = $${paramIndex}`);
        updateValues.push(patient_name_ar);
        paramIndex++;
      }
      if (subtotal !== undefined) {
        updateFields.push(`subtotal = $${paramIndex}`);
        updateValues.push(subtotal);
        paramIndex++;
      }
      if (discount_percentage !== undefined) {
        updateFields.push(`discount_percentage = $${paramIndex}`);
        updateValues.push(discount_percentage);
        paramIndex++;
      }
      if (discount_amount !== undefined) {
        updateFields.push(`discount_amount = $${paramIndex}`);
        updateValues.push(discount_amount);
        paramIndex++;
      }
      if (total_amount !== undefined) {
        updateFields.push(`total_amount = $${paramIndex}`);
        updateValues.push(total_amount);
        paramIndex++;
      }
      if (insurance_company_id !== undefined) {
        updateFields.push(`insurance_company_id = $${paramIndex}`);
        updateValues.push(insurance_company_id);
        paramIndex++;
      }
      if (insurance_coverage_amount !== undefined) {
        updateFields.push(`insurance_coverage_amount = $${paramIndex}`);
        updateValues.push(insurance_coverage_amount);
        paramIndex++;
      }
      if (insurance_coverage_percentage !== undefined) {
        updateFields.push(`insurance_coverage_percentage = $${paramIndex}`);
        updateValues.push(insurance_coverage_percentage);
        paramIndex++;
      }
      if (patient_responsibility !== undefined) {
        updateFields.push(`patient_responsibility = $${paramIndex}`);
        updateValues.push(patient_responsibility);
        paramIndex++;
      }
      if (amount_paid !== undefined) {
        updateFields.push(`amount_paid = $${paramIndex}`);
        updateValues.push(amount_paid);
        paramIndex++;
      }
      if (balance_due !== undefined) {
        updateFields.push(`balance_due = $${paramIndex}`);
        updateValues.push(balance_due);
        paramIndex++;
      }
      if (status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(status);
        paramIndex++;
      }
      if (payment_method !== undefined) {
        updateFields.push(`payment_method = $${paramIndex}`);
        updateValues.push(payment_method);
        paramIndex++;
      }
      if (payment_date !== undefined) {
        updateFields.push(`payment_date = $${paramIndex}`);
        updateValues.push(payment_date);
        paramIndex++;
      }
      if (notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(notes);
        paramIndex++;
      }

      // Always update the timestamp
      updateFields.push(`updatedat = NOW()`);

      console.log('Update fields:', updateFields);
      console.log('Update values:', updateValues);

      // Add the WHERE condition parameter
      updateValues.push(invoiceId);

      const invoiceResult = await pool.query(`
        UPDATE invoices SET
          ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `, updateValues);

      if (invoiceResult.rows.length === 0) {
        await pool.query('ROLLBACK');
        console.log('❌ Invoice not found');
        return;
      }

      const updatedInvoice = invoiceResult.rows[0];
      console.log('✅ Invoice updated successfully');

      // Handle invoice items if provided
      if (items && Array.isArray(items)) {
        console.log(`🔄 Processing ${items.length} items...`);
        
        // Delete existing invoice items
        await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
        console.log('✅ Deleted existing items');

        // Insert new invoice items
        if (items.length > 0) {
          for (const item of items) {
            console.log('Inserting item:', item);
            
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
              item.service_id || item.item_code || '',
              item.service_name || item.item_name || '',
              item.service_name_ar || item.item_name_ar || '',
              item.quantity || 1,
              item.unit_price || 0,
              item.subtotal || (item.quantity || 1) * (item.unit_price || 0)
            ]);
          }
          console.log('✅ Inserted new items');
        }
      }

      // Commit transaction
      await pool.query('COMMIT');
      console.log('✅ Transaction committed successfully');

      // Verify the update
      const verifyResult = await pool.query(`
        SELECT * FROM invoices WHERE id = $1
      `, [invoiceId]);

      const verifyItems = await pool.query(`
        SELECT * FROM invoice_items WHERE invoice_id = $1
      `, [invoiceId]);

      console.log('\n📊 VERIFICATION RESULTS:');
      console.log('Invoice:', {
        id: verifyResult.rows[0].id,
        invoice_number: verifyResult.rows[0].invoice_number,
        notes: verifyResult.rows[0].notes,
        updatedat: verifyResult.rows[0].updatedat
      });
      console.log('Items count:', verifyItems.rows.length);
      verifyItems.rows.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`, {
          service_name: item.service_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price
        });
      });

    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      console.error('❌ Transaction rolled back due to error:', error.message);
      throw error;
    }

  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testInvoicePut().catch(console.error);
