const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function createSchedulingTables() {
  try {
    console.log('🔨 Creating scheduling tables...');
    
    const sql = fs.readFileSync('G:\\Windsurf Workspace\\Tibbna_openEhr\\tibbna-hospital\\database\\create_scheduling_tables.sql', 'utf8');
    await pool.query(sql);
    
    console.log('✅ Scheduling tables created successfully');
    
    // Verify tables
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%schedule%' OR table_name LIKE '%rotation%')
      ORDER BY table_name
    `);
    
    console.log('📊 Scheduling tables created:');
    result.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    
  } catch(err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.end();
  }
}

createSchedulingTables();
