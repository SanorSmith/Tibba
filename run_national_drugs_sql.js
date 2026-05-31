const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  ssl: { rejectUnauthorized: false }
});

async function runSQL() {
  const client = await pool.connect();
  try {
    console.log('Creating National Drugs tables...');
    
    // Read and execute the SQL file
    const sql = fs.readFileSync('database/create_national_drugs_table.sql', 'utf8');
    const result = await client.query(sql);
    
    console.log('✅ Tables created successfully!');
    console.log('Result:', result.rows);
    
    // Verify tables were created
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('national_drugs', 'openehr_medications', 'medication_inventory')
      ORDER BY table_name
    `);
    
    console.log('\n📊 Created tables:');
    tables.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runSQL()
  .then(() => {
    console.log('\n🎉 Success! Now run: npm install csv-parser && node import_national_drugs.js');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });
