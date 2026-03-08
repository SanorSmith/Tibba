const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      AND table_name IN ('notifications','notification_templates','notification_preferences')
      ORDER BY table_name
    `);
    
    console.log('Notification tables found:', result.rows.length);
    result.rows.forEach(row => {
      console.log('  -', row.table_name);
    });
    
    if (result.rows.length === 0) {
      console.log('\n❌ No notification tables found. Migration needs to be fixed and re-run.');
    } else {
      console.log('\n✅ Notification tables exist.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
