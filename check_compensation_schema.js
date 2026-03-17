const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
});

async function checkCompensationSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking employee_compensation table schema...\n');
    
    // Check table structure
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'employee_compensation' 
      ORDER BY ordinal_position
    `;
    
    const schemaResult = await client.query(schemaQuery);
    
    console.log('Table schema:');
    schemaResult.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `[DEFAULT: ${col.column_default}]` : ''}`);
    });
    
    // Check if total_package has a default constraint
    const totalPackageCol = schemaResult.rows.find(col => col.column_name === 'total_package');
    if (totalPackageCol && totalPackageCol.column_default) {
      console.log(`\n❌ Issue found: total_package column has DEFAULT constraint: ${totalPackageCol.column_default}`);
      console.log('The API is trying to insert a value into a column that has a DEFAULT value.');
    }
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkCompensationSchema();
