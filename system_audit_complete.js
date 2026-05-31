const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runCompleteAudit() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TIBBNA HOSPITAL - DETAILED SYSTEM AUDIT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // CRITICAL TABLES DETAILED ANALYSIS
    const criticalTables = [
      'patients',
      'appointments', 
      'employees',
      'departments',
      'invoices',
      'services',
      'pharmacy_orders',
      'lims_orders',
      'staff'
    ];

    for (const tableName of criticalTables) {
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📋 TABLE: ${tableName.toUpperCase()}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // Check if table exists
      const existsResult = await pool.query(`
        SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)
      `, [tableName]);

      if (!existsResult.rows[0].exists) {
        console.log(`❌ Table does NOT exist\n`);
        continue;
      }

      console.log(`✅ Table EXISTS\n`);

      // Get columns
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      console.log('COLUMNS:');
      columnsResult.rows.forEach(col => {
        const nullable = col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL';
        const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
        console.log(`  - ${col.column_name} (${col.data_type}) ${nullable}${defaultVal}`);
      });

      // Get row count
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`\nROW COUNT: ${countResult.rows[0].count} records`);

      // Get sample data (first 2 rows)
      if (countResult.rows[0].count > 0) {
        const sampleResult = await pool.query(`SELECT * FROM ${tableName} LIMIT 2`);
        console.log('\nSAMPLE DATA (First 2 rows):');
        console.log(JSON.stringify(sampleResult.rows, null, 2));
      } else {
        console.log('\n⚠️ Table is EMPTY (0 rows)');
      }
    }

    // Check for encounter/visit/consultation tables
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏥 CLINICAL ENCOUNTER TABLES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const encounterSearchResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE (table_name LIKE '%encounter%' 
         OR table_name LIKE '%visit%' 
         OR table_name LIKE '%consultation%'
         OR table_name LIKE '%admission%')
      AND table_schema = 'public'
      ORDER BY table_name
    `);

    if (encounterSearchResult.rows.length > 0) {
      console.log('✅ Found clinical encounter tables:');
      encounterSearchResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    } else {
      console.log('❌ NO encounter/visit/consultation tables found');
      console.log('⚠️ This means there is NO clinical encounter tracking system!');
    }

    // Check invoice links
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 INVOICE INTEGRATION ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const invoiceLinkResult = await pool.query(`
      SELECT 
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name LIKE '%encounter%') as has_encounter_link,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name LIKE '%appointment%') as has_appointment_link,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'patient_id') as has_patient_link,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name LIKE '%lab%') as has_lab_link,
        EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name LIKE '%pharma%') as has_pharmacy_link
    `);

    console.log('Invoice Integration Status:');
    console.log(JSON.stringify(invoiceLinkResult.rows[0], null, 2));

    // Check pharmacy orders structure
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💊 PHARMACY SYSTEM ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const pharmacyOrdersColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'pharmacy_orders'
      ORDER BY ordinal_position
    `);

    console.log('pharmacy_orders columns:');
    pharmacyOrdersColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const pharmacyOrdersSample = await pool.query(`SELECT * FROM pharmacy_orders LIMIT 2`);
    console.log('\nSample pharmacy_orders:');
    console.log(JSON.stringify(pharmacyOrdersSample.rows, null, 2));

    // Check LIMS orders structure
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔬 LABORATORY SYSTEM ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const limsOrdersColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'lims_orders'
      ORDER BY ordinal_position
    `);

    console.log('lims_orders columns:');
    limsOrdersColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const limsOrdersSample = await pool.query(`SELECT * FROM lims_orders LIMIT 2`);
    console.log('\nSample lims_orders:');
    console.log(JSON.stringify(limsOrdersSample.rows, null, 2));

    // Check staff vs employees
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👥 STAFF vs EMPLOYEES ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const staffColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'staff'
      ORDER BY ordinal_position
    `);

    console.log('staff table columns:');
    staffColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const staffCount = await pool.query(`SELECT COUNT(*) as count FROM staff`);
    const employeeCount = await pool.query(`SELECT COUNT(*) as count FROM employees`);
    
    console.log(`\nstaff table: ${staffCount.rows[0].count} records`);
    console.log(`employees table: ${employeeCount.rows[0].count} records`);
    console.log('\n⚠️ NOTE: You have TWO staff tables! This may cause confusion.');

    // Check all foreign keys related to invoices
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 INVOICE FOREIGN KEY RELATIONSHIPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const invoiceFKResult = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND (tc.table_name LIKE '%invoice%' OR ccu.table_name LIKE '%invoice%')
      ORDER BY tc.table_name
    `);

    if (invoiceFKResult.rows.length > 0) {
      console.log('Invoice-related foreign keys:');
      invoiceFKResult.rows.forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('⚠️ NO foreign keys found for invoices table');
    }

    // Check what references patients
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 PATIENT REFERENCES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const patientRefsResult = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'patients'
      ORDER BY tc.table_name
    `);

    console.log('Tables that reference patients:');
    patientRefsResult.rows.forEach(ref => {
      console.log(`  - ${ref.table_name}.${ref.column_name}`);
    });

    // Check budget and purchase request tables
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 FINANCE MODULE TABLES DETAIL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const financeTables = [
      'budget_periods',
      'budget_categories',
      'budget_allocations',
      'budget_transactions',
      'shareholders',
      'purchase_requests',
      'purchase_request_items',
      'purchase_request_approvals'
    ];

    for (const tableName of financeTables) {
      const existsResult = await pool.query(`
        SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)
      `, [tableName]);

      if (existsResult.rows[0].exists) {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        console.log(`✅ ${tableName}: ${countResult.rows[0].count} rows`);
      } else {
        console.log(`❌ ${tableName}: DOES NOT EXIST`);
      }
    }

    // Check payroll integration potential
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💵 PAYROLL INTEGRATION ANALYSIS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const payrollTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%payroll%' OR table_name LIKE '%payslip%'
      AND table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('Payroll tables:');
    payrollTables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    const payrollTransactionsCount = await pool.query(`SELECT COUNT(*) as count FROM payroll_transactions`);
    console.log(`\npayroll_transactions: ${payrollTransactionsCount.rows[0].count} records`);

    // Sample payroll transaction
    const payrollSample = await pool.query(`SELECT * FROM payroll_transactions LIMIT 1`);
    console.log('\nSample payroll transaction:');
    console.log(JSON.stringify(payrollSample.rows[0], null, 2));

    // Check employee compensation
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💰 EMPLOYEE COMPENSATION STRUCTURE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const compensationColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'employee_compensation'
      ORDER BY ordinal_position
    `);

    console.log('employee_compensation columns:');
    compensationColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    const compensationSample = await pool.query(`SELECT * FROM employee_compensation LIMIT 2`);
    console.log('\nSample compensation records:');
    console.log(JSON.stringify(compensationSample.rows, null, 2));

    // Check ALL foreign keys in system
    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔗 ALL FOREIGN KEY RELATIONSHIPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const allFKResult = await pool.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name, kcu.column_name
    `);

    console.log(`Found ${allFKResult.rows.length} foreign key relationships:\n`);
    
    let currentTable = '';
    allFKResult.rows.forEach(fk => {
      if (fk.table_name !== currentTable) {
        console.log(`\n📋 ${fk.table_name}:`);
        currentTable = fk.table_name;
      }
      console.log(`  ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DETAILED AUDIT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ ERROR during audit:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

runCompleteAudit();
