const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function testPayrollQuery() {
  const client = await pool.connect();
  
  try {
    console.log('=== TESTING PAYROLL QUERY ===');
    
    // Check payroll_transactions structure
    const structure = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'payroll_transactions' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('Payroll transactions structure:');
    structure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Test the exact payroll query from API
    const payrollQuery = `
      SELECT 
        'SALARIES_WAGES' as category,
        SUM(CASE WHEN pt.transaction_type = 'EARNING' THEN pt.amount ELSE 0 END) as expenses,
        COUNT(DISTINCT pt.employee_id) as transaction_count,
        'HR Department' as department_name
      FROM payroll_transactions pt
      WHERE 1=1 AND DATE(pt.createdat) >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    
    console.log('\n🔍 Testing payroll query...');
    try {
      const result = await client.query(payrollQuery);
      console.log(`✅ Payroll query successful: ${result.rows.length} rows`);
      if (result.rows.length > 0) {
        console.log(`  Expenses: ${result.rows[0].expenses}`);
      }
    } catch (err) {
      console.log(`❌ Payroll query failed: ${err.message}`);
      
      // Try without date filter
      const noDateQuery = `
        SELECT 
          'SALARIES_WAGES' as category,
          SUM(CASE WHEN pt.transaction_type = 'EARNING' THEN pt.amount ELSE 0 END) as expenses,
          COUNT(DISTINCT pt.employee_id) as transaction_count,
          'HR Department' as department_name
        FROM payroll_transactions pt
        WHERE 1=1
      `;
      
      console.log('\n🔍 Testing without date filter...');
      try {
        const noDateResult = await client.query(noDateQuery);
        console.log(`✅ No date filter successful: ${noDateResult.rows.length} rows`);
        if (noDateResult.rows.length > 0) {
          console.log(`  Expenses: ${noDateResult.rows[0].expenses}`);
        }
      } catch (err2) {
        console.log(`❌ No date filter also failed: ${err2.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testPayrollQuery();
