// Check what patient tables exist in the Neon database
const postgres = require('postgres');

const databaseUrl = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_RBybikcu3tz5@ep-long-river-allaqs25.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = postgres(databaseUrl, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkPatientTables() {
  try {
    console.log('🔍 Checking for patient tables in Neon database...');
    
    // Get all tables
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%patient%' OR table_name LIKE '%people%')
      ORDER BY table_name
    `;
    
    console.log('\n📋 Found tables related to patients:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    // Check patients table structure
    const patientsTable = tables.find(t => t.table_name === 'patients');
    if (patientsTable) {
      console.log(`\n📊 Structure of patients table:`);
      
      const columns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'patients'
        ORDER BY ordinal_position
      `;
      
      columns.forEach((column) => {
        console.log(`  - ${column.column_name}: ${column.data_type} (${column.is_nullable})`);
      });
      
      // Get sample data
      console.log(`\n📝 Sample data from patients table:`);
      const sampleData = await sql`
        SELECT *
        FROM patients
        LIMIT 3
      `;
      
      sampleData.forEach((row, index) => {
        console.log(`  ${index + 1}. ${JSON.stringify(row, null, 2)}`);
      });
    }
    
    console.log('\n✅ Table check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkPatientTables();
