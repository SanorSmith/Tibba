const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function runAudit() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 TIBBNA HOSPITAL - COMPLETE SYSTEM AUDIT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // QUERY 1: List ALL tables
    console.log('1️⃣ LISTING ALL TABLES IN PUBLIC SCHEMA:\n');
    const tablesResult = await pool.query(`
      SELECT 
        tablename,
        schemaname
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log(`Found ${tablesResult.rows.length} tables:\n`);
    tablesResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.tablename}`);
    });

    // QUERY 2: Check critical tables existence
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣ CHECKING CRITICAL TABLES:\n');
    const criticalTablesResult = await pool.query(`
      SELECT 
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') as patients_exists,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'encounters') as encounters_exists,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') as appointments_exists,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') as employees_exists,
        EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') as departments_exists
    `);
    
    console.log('Critical Tables Status:');
    console.log(JSON.stringify(criticalTablesResult.rows[0], null, 2));

    // QUERY 3: Check invoices table structure
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣ INVOICES TABLE STRUCTURE:\n');
    const invoiceColumnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'invoices'
      ORDER BY ordinal_position
    `);
    
    console.log('Invoices columns:');
    invoiceColumnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // QUERY 4: Find lab-related tables
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣ LAB-RELATED TABLES:\n');
    const labTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%lab%' 
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (labTablesResult.rows.length > 0) {
      console.log('Lab tables found:');
      labTablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    } else {
      console.log('❌ NO lab-related tables found');
    }

    // QUERY 5: Find pharmacy-related tables
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣ PHARMACY-RELATED TABLES:\n');
    const pharmacyTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE (table_name LIKE '%pharm%' OR table_name LIKE '%medic%' OR table_name LIKE '%prescript%')
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (pharmacyTablesResult.rows.length > 0) {
      console.log('Pharmacy tables found:');
      pharmacyTablesResult.rows.forEach(row => console.log(`  - ${row.table_name}`));
    } else {
      console.log('❌ NO pharmacy-related tables found');
    }

    // QUERY 6: Find ALL foreign keys
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('6️⃣ ALL FOREIGN KEY RELATIONSHIPS:\n');
    const foreignKeysResult = await pool.query(`
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
      ORDER BY tc.table_name
    `);
    
    console.log(`Found ${foreignKeysResult.rows.length} foreign key relationships:\n`);
    foreignKeysResult.rows.forEach(fk => {
      console.log(`  ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });

    // QUERY 7: Get row counts for all tables
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('7️⃣ ROW COUNTS FOR ALL TABLES:\n');
    
    for (const table of tablesResult.rows) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
        console.log(`  ${table.tablename}: ${countResult.rows[0].count} rows`);
      } catch (err) {
        console.log(`  ${table.tablename}: ERROR - ${err.message}`);
      }
    }

    // QUERY 8: Check encounter/visit tables
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('8️⃣ ENCOUNTER/VISIT TABLES:\n');
    const encounterTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE (table_name LIKE '%encounter%' OR table_name LIKE '%visit%' OR table_name LIKE '%consultation%')
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (encounterTablesResult.rows.length > 0) {
      console.log('Encounter/Visit tables found:');
      for (const table of encounterTablesResult.rows) {
        console.log(`\n  TABLE: ${table.table_name}`);
        
        const columnsResult = await pool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [table.table_name]);
        
        console.log('  Columns:');
        columnsResult.rows.forEach(col => {
          console.log(`    - ${col.column_name} (${col.data_type})`);
        });
      }
    } else {
      console.log('❌ NO encounter/visit tables found');
    }

    // QUERY 9: Check appointments table structure
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('9️⃣ APPOINTMENTS TABLE STRUCTURE:\n');
    const appointmentsExist = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments')
    `);
    
    if (appointmentsExist.rows[0].exists) {
      const appointmentColumnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'appointments'
        ORDER BY ordinal_position
      `);
      
      console.log('Appointments columns:');
      appointmentColumnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
      });

      const appointmentCountResult = await pool.query(`SELECT COUNT(*) as count FROM appointments`);
      console.log(`\nTotal appointments: ${appointmentCountResult.rows[0].count}`);

      const appointmentSampleResult = await pool.query(`SELECT * FROM appointments LIMIT 2`);
      console.log('\nSample appointments:');
      console.log(JSON.stringify(appointmentSampleResult.rows, null, 2));
    } else {
      console.log('❌ Appointments table does NOT exist');
    }

    // QUERY 10: Check employees table structure
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔟 EMPLOYEES TABLE STRUCTURE:\n');
    const employeesExist = await pool.query(`
      SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'employees')
    `);
    
    if (employeesExist.rows[0].exists) {
      const employeeColumnsResult = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns 
        WHERE table_name = 'employees'
        ORDER BY ordinal_position
      `);
      
      console.log('Employees columns:');
      employeeColumnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
      });

      const employeeCountResult = await pool.query(`SELECT COUNT(*) as count FROM employees WHERE status = 'active'`);
      console.log(`\nActive employees: ${employeeCountResult.rows[0].count}`);
    } else {
      console.log('❌ Employees table does NOT exist');
    }

    // QUERY 11: Check for service-related junction tables
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣1️⃣ SERVICE JUNCTION TABLES:\n');
    const serviceJunctionResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE (table_name LIKE '%service%' OR table_name LIKE '%item%')
      AND table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('Service-related tables:');
    serviceJunctionResult.rows.forEach(row => console.log(`  - ${row.table_name}`));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ AUDIT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ ERROR during audit:', error);
  } finally {
    await pool.end();
  }
}

runAudit();
