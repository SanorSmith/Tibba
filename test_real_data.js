const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function testRealData() {
  const client = await pool.connect();
  
  try {
    console.log('=== TESTING REAL DATA QUERY ===');
    
    // Test the exact query from the API
    const serviceRevenueQuery = `
      SELECT 
        s.category,
        SUM(s.price_self_pay + s.price_insurance + s.price_government) as revenue,
        COUNT(*) as transaction_count,
        COALESCE(d.name, 'Uncategorized Department') as department_name
      FROM services s
      LEFT JOIN departments d ON d.departmentid::text = s.department_id
      WHERE s.active = true AND DATE(s.createdat) >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY s.category, d.name
      ORDER BY revenue DESC
    `;
    
    console.log('Executing query...');
    const result = await client.query(serviceRevenueQuery);
    
    console.log(`\n📊 Real Data Results (${result.rows.length} rows):`);
    if (result.rows.length === 0) {
      console.log('❌ No data found. Checking why...');
      
      // Check if services have createdat in current month
      const dateCheck = await client.query(`
        SELECT COUNT(*) as count, MIN(createdat) as oldest, MAX(createdat) as newest
        FROM services 
        WHERE active = true
      `);
      
      console.log('Services date info:', dateCheck.rows[0]);
      
      // Try without date filter
      const noDateFilter = await client.query(`
        SELECT 
          s.category,
          SUM(s.price_self_pay + s.price_insurance + s.price_government) as revenue,
          COUNT(*) as transaction_count,
          COALESCE(d.name, 'Uncategorized Department') as department_name
        FROM services s
        LEFT JOIN departments d ON d.departmentid::text = s.department_id
        WHERE s.active = true
        GROUP BY s.category, d.name
        ORDER BY revenue DESC
        LIMIT 5
      `);
      
      console.log('\n📊 Without date filter:');
      noDateFilter.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.category}: ${row.revenue} (${row.department_name})`);
      });
      
    } else {
      result.rows.forEach((row, i) => {
        console.log(`${i + 1}. ${row.category}: ${row.revenue} (${row.department_name})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testRealData();
