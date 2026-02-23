const postgres = require('postgres');

async function checkSchema() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    console.log('🔍 Checking patients table schema...\n');
    
    // Get column information
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'patients' 
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Patients Table Columns:');
    columns.forEach(col => {
      console.log(`• ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Get sample data to see actual structure
    console.log('\n📊 Sample patient data:');
    const sample = await sql`SELECT * FROM patients LIMIT 3`;
    
    if (sample.length > 0) {
      console.log('First patient record:');
      Object.keys(sample[0]).forEach(key => {
        console.log(`• ${key}: ${sample[0][key]}`);
      });
    }

    // Count patients
    const count = await sql`SELECT COUNT(*) as count FROM patients`;
    console.log(`\n📈 Total Patients: ${count[0].count}`);
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchema();
