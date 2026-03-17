const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkStaffStructure() {
  try {
    console.log('🔍 Checking Staff Table Structure\n');
    console.log('='.repeat(60));
    
    // Get staff table columns
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'staff'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Staff Table Columns:\n');
    columnsResult.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Check for primary key
    const pkResult = await pool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'staff'::regclass AND i.indisprimary
    `);
    
    console.log('\n🔑 Primary Key:\n');
    if (pkResult.rows.length > 0) {
      pkResult.rows.forEach(row => {
        console.log(`   ✓ ${row.attname}`);
      });
    } else {
      console.log('   ❌ No primary key found!');
    }
    
    // Check patients table too
    console.log('\n📊 Patients Table Columns:\n');
    const patientsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'patients'
      ORDER BY ordinal_position
      LIMIT 10
    `);
    
    patientsResult.rows.forEach(col => {
      console.log(`   ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)}`);
    });
    
    // Check patients primary key
    const patientsPkResult = await pool.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'patients'::regclass AND i.indisprimary
    `);
    
    console.log('\n🔑 Patients Primary Key:\n');
    if (patientsPkResult.rows.length > 0) {
      patientsPkResult.rows.forEach(row => {
        console.log(`   ✓ ${row.attname}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStaffStructure();
