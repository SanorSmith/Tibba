const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function testFixedPayroll() {
  const client = await pool.connect();
  
  try {
    console.log('=== TESTING FIXED PAYROLL QUERY ===');
    
    // Test the fixed payroll query
    const payrollQuery = `
      SELECT 
        'SALARIES_WAGES' as category,
        SUM(pt.gross_salary) as expenses,
        COUNT(DISTINCT pt.employee_id) as transaction_count,
        'HR Department' as department_name
      FROM payroll_transactions pt
      WHERE 1=1 AND DATE(pt.created_at) >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    
    console.log('🔍 Testing fixed payroll query...');
    try {
      const result = await client.query(payrollQuery);
      console.log(`✅ Fixed payroll query successful: ${result.rows.length} rows`);
      if (result.rows.length > 0) {
        console.log(`  Expenses: ${result.rows[0].expenses}`);
        console.log(`  Transaction count: ${result.rows[0].transaction_count}`);
      }
    } catch (err) {
      console.log(`❌ Fixed payroll query failed: ${err.message}`);
      
      // Try without date filter
      const noDateQuery = `
        SELECT 
          'SALARIES_WAGES' as category,
          SUM(pt.gross_salary) as expenses,
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
          console.log(`  Transaction count: ${noDateResult.rows[0].transaction_count}`);
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

testFixedPayroll();
