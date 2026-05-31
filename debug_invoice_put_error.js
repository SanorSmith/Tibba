// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function debugInvoicePutError() {
  console.log('🔍 DEBUGGING INVOICE PUT ERROR');
  console.log('=====================================');

  const invoiceId = '8fbd36ee-ad58-4830-9f9c-f1133571a14b';

  try {
    // 1. Check if invoice exists
    console.log('\n1. Checking if invoice exists...');
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
      patient_id: invoice.patient_id,
      total_amount: invoice.total_amount,
      status: invoice.status
    });

    // 2. Check invoice_items table structure
    console.log('\n2. Checking invoice_items table structure...');
    const structureResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'invoice_items'
      ORDER BY ordinal_position
    `);

    console.log('invoice_items columns:');
    structureResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 3. Check existing invoice items
    console.log('\n3. Checking existing invoice items...');
    const itemsResult = await pool.query(`
      SELECT * FROM invoice_items WHERE invoice_id = $1
    `, [invoiceId]);

    console.log(`Found ${itemsResult.rows.length} items:`);
    itemsResult.rows.forEach((item, index) => {
      console.log(`  Item ${index + 1}:`, {
        id: item.id,
        service_id: item.service_id,
        service_name: item.service_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price
      });
    });

    // 4. Test a simple update without items
    console.log('\n4. Testing simple invoice update (no items)...');
    const testUpdate = await pool.query(`
      UPDATE invoices 
      SET notes = $2, updatedat = NOW()
      WHERE id = $1
      RETURNING *
    `, [invoiceId, 'Test update at ' + new Date().toISOString()]);

    console.log('✅ Simple update successful:', testUpdate.rows[0].notes);

    // 5. Test invoice item delete and insert
    console.log('\n5. Testing invoice item operations...');
    
    // Start a test transaction
    await pool.query('BEGIN');
    
    try {
      // Delete existing items
      await pool.query('DELETE FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
      console.log('✅ Deleted existing items');

      // Test inserting a new item
      const testItem = {
        service_id: 'test-service-123',
        service_name: 'Test Service',
        service_name_ar: 'خدمة اختبار',
        quantity: 1,
        unit_price: 100.00,
        total_price: 100.00
      };

      const insertResult = await pool.query(`
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
        RETURNING *
      `, [
        invoiceId,
        testItem.service_id,
        testItem.service_name,
        testItem.service_name_ar,
        testItem.quantity,
        testItem.unit_price,
        testItem.total_price
      ]);

      console.log('✅ Test item inserted:', insertResult.rows[0]);

      // Rollback the test transaction
      await pool.query('ROLLBACK');
      console.log('✅ Test transaction rolled back');

    } catch (error) {
      await pool.query('ROLLBACK');
      console.error('❌ Error in item operations test:', error.message);
      throw error;
    }

    // 6. Check for any constraints
    console.log('\n6. Checking table constraints...');
    const constraintsResult = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      LEFT JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_name = 'invoice_items'
        AND tc.constraint_type IN ('FOREIGN KEY', 'CHECK', 'UNIQUE')
    `);

    console.log('invoice_items constraints:');
    constraintsResult.rows.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
      if (constraint.constraint_type === 'FOREIGN KEY') {
        console.log(`    References: ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      }
    });

    console.log('\n✅ DEBUGGING COMPLETE');
    console.log('If no errors appeared above, the issue might be:');
    console.log('1. Data validation in the frontend');
    console.log('2. Missing required fields in the PUT request');
    console.log('3. Data type mismatches');

  } catch (error) {
    console.error('❌ DEBUG ERROR:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugInvoicePutError().catch(console.error);
