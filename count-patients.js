const postgres = require('postgres');

async function countPatients() {
  try {
    const sql = postgres('postgresql://neondb_owner:npg_8FjAiWwJlhz7@ep-red-cherry-ag82jhqf-pooler.c-2.eu-central-1.aws.neon.tech/neondb', { 
      ssl: 'require',
      max: 1
    });

    const result = await sql`SELECT COUNT(*) as count FROM patients`;
    console.log(`📊 Total Patient Records: ${result[0].count}`);
    
    // Also get some basic stats
    const stats = await sql`
      SELECT 
        COUNT(*) as total_patients,
        COUNT(CASE WHEN gender = 'MALE' THEN 1 END) as male_patients,
        COUNT(CASE WHEN gender = 'FEMALE' THEN 1 END) as female_patients,
        COUNT(CASE WHEN date_of_birth IS NOT NULL THEN 1 END) as with_dob,
        COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as with_phone,
        MIN(created_at) as earliest_record,
        MAX(created_at) as latest_record
      FROM patients
    `;
    
    console.log('\n📈 Patient Database Statistics:');
    console.log(`• Total Patients: ${stats[0].total_patients}`);
    console.log(`• Male Patients: ${stats[0].male_patients}`);
    console.log(`• Female Patients: ${stats[0].female_patients}`);
    console.log(`• With Date of Birth: ${stats[0].with_dob}`);
    console.log(`• With Phone Number: ${stats[0].with_phone}`);
    console.log(`• Earliest Record: ${stats[0].earliest_record || 'N/A'}`);
    console.log(`• Latest Record: ${stats[0].latest_record || 'N/A'}`);
    
    await sql.end();
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
  }
}

countPatients();
