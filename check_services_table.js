const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function checkServicesTable() {
  const client = await pool.connect();
  
  try {
    console.log('=== CHECKING SERVICES TABLE ===');
    
    // Check if services table exists
    const tableCheck = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'services' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Services table does not exist');
      return;
    }
    
    console.log('✅ Services table structure:');
    tableCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check departments table structure
    const deptCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'departments' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ Departments table structure:');
    deptCheck.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Test the fixed query
    console.log('\n🔍 Testing fixed query...');
    const testQuery = `
      SELECT 
        s.category,
        SUM(s.price_self_pay + s.price_insurance + s.price_government) as revenue,
        COUNT(*) as transaction_count,
        d.name as department_name
      FROM services s
      LEFT JOIN departments d ON s.department_id::text = d.departmentid::text
      WHERE s.active = true AND DATE(s.createdat) >= DATE_TRUNC('month', CURRENT_DATE)
      GROUP BY s.category, d.name
      ORDER BY revenue DESC
      LIMIT 5
    `;
    
    const result = await client.query(testQuery);
    console.log(`\n📊 Query Results (${result.rows.length} rows):`);
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.category}: ${row.revenue} (${row.department_name || 'No Department'})`);
    });
    
    // Check if we have any services data
    const countResult = await client.query('SELECT COUNT(*) as total FROM services WHERE active = true');
    console.log(`\n📈 Total active services: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkServicesTable();
