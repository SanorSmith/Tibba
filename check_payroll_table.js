const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function checkPayrollTable() {
  const client = await pool.connect();
  
  try {
    console.log('=== CHECKING PAYROLL TABLES ===');
    
    // Check if payroll_transactions table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name LIKE '%payroll%' AND table_schema = 'public'
    `);
    
    console.log('Payroll-related tables:');
    if (tableCheck.rows.length === 0) {
      console.log('  ❌ No payroll tables found');
    } else {
      tableCheck.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
    }
    
    // Check for any employee or salary related tables
    const empTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE (table_name LIKE '%employee%' OR table_name LIKE '%salary%' OR table_name LIKE '%pay%') 
      AND table_schema = 'public'
    `);
    
    console.log('\nEmployee/Salary related tables:');
    if (empTables.rows.length === 0) {
      console.log('  ❌ No employee/salary tables found');
    } else {
      empTables.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
    }
    
    // Test payroll query if table exists
    if (tableCheck.rows.length > 0) {
      const payrollTable = tableCheck.rows[0].table_name;
      console.log(`\n🔍 Testing ${payrollTable} table...`);
      
      try {
        const payrollTest = await client.query(`
          SELECT COUNT(*) as count 
          FROM ${payrollTable}
        `);
        console.log(`  ✅ ${payrollTable} has ${payrollTest.rows[0].count} records`);
      } catch (err) {
        console.log(`  ❌ Error accessing ${payrollTable}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkPayrollTable();
