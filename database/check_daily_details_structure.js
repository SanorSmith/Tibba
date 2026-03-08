const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkTableStructure() {
  try {
    console.log('🔍 Checking daily_schedule_details table structure...');
    
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'daily_schedule_details'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Table Structure:');
    console.log('================================');
    result.rows.forEach(row => {
      console.log(`📄 ${row.column_name}: ${row.data_type} (${row.is_nullable}) ${row.column_default ? `[${row.column_default}]` : ''}`);
    });
    
    // Check if table has any data
    const countResult = await pool.query('SELECT COUNT(*) as count FROM daily_schedule_details');
    console.log(`\n📊 Current records: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTableStructure();
